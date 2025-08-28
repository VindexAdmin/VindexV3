// This file contains the content script for the Vindex wallet extension.
// It interacts with web pages to modify the DOM or access page data.

const walletAddress = "your-wallet-address"; // Replace with actual wallet address

// Function to inject wallet information into the webpage
function injectWalletInfo() {
    const walletInfoDiv = document.createElement('div');
    walletInfoDiv.style.position = 'fixed';
    walletInfoDiv.style.bottom = '10px';
    walletInfoDiv.style.right = '10px';
    walletInfoDiv.style.backgroundColor = '#DC2626';
    walletInfoDiv.style.color = '#FFFFFF';
    walletInfoDiv.style.padding = '10px';
    walletInfoDiv.style.borderRadius = '5px';
    walletInfoDiv.style.zIndex = '9999';
    walletInfoDiv.innerText = `Vindex Wallet: ${walletAddress}`;
    
    document.body.appendChild(walletInfoDiv);
}

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showWalletInfo") {
        injectWalletInfo();
        sendResponse({ status: "success" });
    }
});