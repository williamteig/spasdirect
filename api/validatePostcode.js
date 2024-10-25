import https from 'https';

export default function handler(req, res) {
  const { postcode } = req.query;
  
  const apiKey = process.env.AUSPOST_API_KEY;
  const ausPostUrl = `https://digitalapi.auspost.com.au/postcode/search.json?q=${postcode}`;
  
  const options = {
    headers: {
      'auth-key': apiKey
    }
  };

  https.get(ausPostUrl, options, (response) => {
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      res.status(200).json(JSON.parse(data));
    });

  }).on('error', (err) => {
    res.status(500).json({ error: 'Error fetching data' });
  });
}
