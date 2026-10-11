import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const get = async (path, cookie='') => fetch(base+path,{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});
const post = async (path, data, cookie='') => fetch(base+path,{method:'POST',body:new URLSearchParams(data),headers:cookie?{Cookie:cookie}:{},redirect:'manual'});
const page = async (path,cookie='') => {const r=await get(path,cookie);assert.equal(r.status,200,`${path}: HTTP ${r.status}`);return r.text()};
const csrf = html => {const m=html.match(/name="csrf" value="([^"]+)"/);assert.ok(m,'CSRF field');return m[1]};
const stamp = Date.now().toString(36);

const publicRoutes=['/','/katalog','/galeri','/favorit','/promo','/keranjang','/checkout','/pesanan','/tentang','/kontak','/faq','/cara-pesan','/pengiriman','/pembayaran','/kebijakan-retur','/privasi','/syarat-ketentuan','/admin/login'];
const products=await (await get('/api/products')).json();
assert.ok(products.length>=12);
const categories=['kue-kering','cake-tart','roti-pastry','dessert-box','hampers','minuman'];
const detailRoutes=[...categories.map(x=>'/kategori/'+x),...products.map(x=>'/produk/'+x.slug)];
const checked=new Set();
for(const route of [...publicRoutes,...detailRoutes]){
  const html=await page(route);checked.add(route);
  for(const [,href] of html.matchAll(/href="(\/[^"]*)"/g)){
    const target=href.split('?')[0];
    if(target.startsWith('/admin')&&target!=='/admin/login')continue;
    if(checked.has(target))continue;
    const res=await get(target);
    assert.ok(res.status===200||res.status===303,`Tautan putus ${route} → ${href}: ${res.status}`);
    checked.add(target);
  }
}
for(const asset of ['/style.css','/app.js','/favicon.svg','/art/cake.svg'])assert.equal((await get(asset)).status,200,asset);

const login=await post('/admin/login',{password});
assert.equal(login.status,303,'login admin');
const cookie=login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
const adminRoutes=['/admin','/admin/produk','/admin/produk/baru','/admin/kategori','/admin/galeri','/admin/pesanan','/admin/pesan','/admin/laporan','/admin/pengaturan'];
for(const route of adminRoutes)await page(route,cookie);
const token=csrf(await page('/admin',cookie));

let r=await post('/admin/kategori/baru',{csrf:token,name:'Kategori Tes '+stamp,slug:'kategori-tes-'+stamp,description:'Kategori pemeriksaan',color:'#AABBCC'},cookie);
assert.equal(r.status,303,'buat kategori');
let html=await page('/admin/kategori',cookie);
// Find ID from the edit link in the same table row, independent of table order.
const row=html.match(new RegExp(`<tr>(?:(?!<\\/tr>)[^])*Kategori Tes ${stamp}(?:(?!<\\/tr>)[^])*<\\/tr>`))?.[0];
const catId=Number(row?.match(/\/admin\/kategori\?edit=(\d+)/)?.[1]);
assert.ok(catId,'kategori baru terlihat');
r=await post(`/admin/kategori/${catId}/edit`,{csrf:token,name:'Kategori Tes '+stamp,slug:'kategori-tes-'+stamp,description:'Kategori telah diedit',color:'#AABBCC'},cookie);
assert.equal(r.status,303,'edit kategori');

r=await post('/admin/produk/baru',{csrf:token,name:'Produk Tes '+stamp,slug:'produk-tes-'+stamp,category_id:String(catId),description:'Produk untuk uji alur',price:'19000',stock:'5',art:'cake',featured:'1',active:'1'},cookie);
assert.equal(r.status,303,'buat produk');
const testProduct=products.find(x=>x.slug==='produk-tes-'+stamp)|| (await (await get('/api/products')).json()).find(x=>x.slug==='produk-tes-'+stamp);
assert.ok(testProduct,'produk baru muncul di API');
await page('/produk/produk-tes-'+stamp);
r=await post(`/admin/produk/${testProduct.id}/edit`,{csrf:token,name:'Produk Tes Edit '+stamp,slug:'produk-tes-'+stamp,category_id:String(catId),description:'Produk sudah diedit',price:'21000',stock:'5',art:'cake',active:'1'},cookie);
assert.equal(r.status,303,'edit produk');

r=await post('/admin/galeri/baru',{csrf:token,title:'Galeri Tes '+stamp,caption:'Uji galeri',art:'gift'},cookie);
assert.equal(r.status,303,'buat galeri');
html=await page('/admin/galeri',cookie);
const galleryRow=html.match(new RegExp(`<div><img[^]*?Galeri Tes ${stamp}[^]*?<\\/div>`))?.[0];
const galleryId=Number(galleryRow?.match(/\/admin\/galeri\?edit=(\d+)/)?.[1]);
assert.ok(galleryId,'galeri baru terlihat');
r=await post(`/admin/galeri/${galleryId}/edit`,{csrf:token,title:'Galeri Tes '+stamp,caption:'Uji galeri diedit',art:'cake'},cookie);
assert.equal(r.status,303,'edit galeri');
assert.ok((await page('/galeri')).includes('Uji galeri diedit'));

r=await post('/api/orders',{customer_name:'Pelanggan Uji',email:'uji@example.test',phone:'0812345678',address:'Alamat lokal untuk uji',notes:'',payment:'Transfer bank',cart:JSON.stringify([{id:testProduct.id,qty:2}])});
assert.equal(r.status,201,'buat pesanan');
const order=await r.json();
assert.ok((await page(order.url)).includes('Rp42.000'),'detail dan total pesanan');
r=await post(`/pesanan/${order.code}/konfirmasi`,{token:order.token,reference:'DEMO-'+stamp});
assert.equal(r.status,303,'konfirmasi pembayaran');
assert.ok((await page(order.url)).includes('Menunggu verifikasi'));
html=await page('/admin/pesanan',cookie);
const orderRow=html.match(new RegExp(`<tr>(?:(?!<\\/tr>)[^])*${order.code}(?:(?!<\\/tr>)[^])*<\\/tr>`))?.[0];
const orderId=Number(orderRow?.match(/\/admin\/pesanan\/(\d+)/)?.[1]);
assert.ok(orderId,'pesanan admin terlihat');
r=await post(`/admin/pesanan/${orderId}/status`,{csrf:token,status:'Selesai'},cookie);
assert.equal(r.status,303,'ubah status pesanan');
assert.ok((await page(order.url)).includes('Selesai'));
await page(`/admin/pesanan/${orderId}`,cookie);
await page(`/admin/produk/${testProduct.id}/edit`,cookie);
for(const [route,label] of [[`/admin/pesanan/${orderId}/hapus`,'hapus pesanan'],[`/admin/produk/${testProduct.id}/hapus`,'hapus produk'],[`/admin/galeri/${galleryId}/hapus`,'hapus galeri'],[`/admin/kategori/${catId}/hapus`,'hapus kategori']]){
  r=await post(route,{csrf:token},cookie);assert.equal(r.status,303,label);
}
console.log(`LULUS: ${publicRoutes.length+detailRoutes.length} halaman publik, ${adminRoutes.length} halaman admin, semua tautan internal, aset, CRUD kategori/produk/galeri, checkout, konfirmasi, dan status pesanan.`);
