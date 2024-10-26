import https from 'https';

export default function handler(req, res) {
  const { postcode } = req.query;
  
  if (!postcode) {
    return res.status(400).json({ error: 'Postcode is required' });
  }

  const apiKey = process.env.AUSPOST_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is not configured' });
  }

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
      try {
        const parsedData = JSON.parse(data);
        res.status(200).json(parsedData);
      } catch (error) {
        res.status(500).json({ error: 'Error parsing response data' });
      }
    });

  }).on('error', (err) => {
    res.status(500).json({ error: 'Error fetching data from AusPost API' });
  });
}
