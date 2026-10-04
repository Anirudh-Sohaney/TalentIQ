const https = require('https');

https.get('https://mmdfxpdxzqbagusfknuc.supabase.co/rest/v1/', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
}).on('error', (e) => {
  console.error('Error:', e);
});
