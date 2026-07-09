const https = require('https');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2JhYTkxNzM5M2UyNjQ3YmZhOWM3MWU5Y2YwM2M3ZTNmEgsSBxDs-L-z_hUYAZIBIwoKcHJvamVjdF9pZBIVQhM0MjkwODcxNjQ2MjY4NTYwNTE3&filename=&opi=89354086";

function download(url) {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      return download(res.headers.location);
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      fs.writeFileSync('stitch_full.html', data);
      console.log('Download complete. File size:', data.length);
    });
  }).on('error', err => console.error(err));
}

download(url);
