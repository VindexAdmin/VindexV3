import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Esta función sería ejecutada en el cliente para verificar localStorage
    const clientScript = `
      <html>
        <head><title>LocalStorage Check</title></head>
        <body>
          <h1>LocalStorage Verification</h1>
          <div id="results"></div>
          <script>
            const bridgeTransactions = localStorage.getItem('vindex_bridge_transactions');
            const vindexTransactions = localStorage.getItem('vindex_transactions');
            
            document.getElementById('results').innerHTML = 
              '<h3>Bridge Transactions:</h3><pre>' + 
              JSON.stringify(bridgeTransactions ? JSON.parse(bridgeTransactions) : null, null, 2) + 
              '</pre><h3>Vindex Transactions:</h3><pre>' + 
              JSON.stringify(vindexTransactions ? JSON.parse(vindexTransactions) : null, null, 2) + 
              '</pre>';
          </script>
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(clientScript);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
