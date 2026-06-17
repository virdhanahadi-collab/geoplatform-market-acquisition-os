NETLIFY DEPLOYMENT

1. Upload folder 04_Netlify_Frontend ke Netlify atau connect ke Git.
2. Buka Site Settings > Environment Variables.
3. Tambahkan GAS_URL = URL Web App Apps Script.
4. Deploy ulang site.
5. Test endpoint:
   https://YOUR-SITE.netlify.app/.netlify/functions/google-api?action=health
6. Jika health OK, GUI bisa memakai endpoint:
   /.netlify/functions/google-api?action=getContacts
