const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function loadCookies(page) {
    let cookies;

    if (process.env.COOKIES_JSON) {
        console.log("✅ Loading cookies from ENV variable...");
        try {
            cookies = JSON.parse(process.env.COOKIES_JSON);
        } catch (error) {
            console.error("❌ Failed to parse cookies from ENV variable:", error.message);
            process.exit(1);
        }
    } else if (fs.existsSync('cookies.json')) {
        console.log("✅ Loading cookies from file...");
        try {
            cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
        } catch (error) {
            console.error("❌ Failed to read cookies from file:", error.message);
            process.exit(1);
        }
    } else {
        console.error("❌ No cookies found in ENV or file.");
        process.exit(1);
    }

    await page.setCookie(...cookies);
    console.log("✅ Cookies loaded successfully.");
}

async function verifyAccessToken(accessToken) {
    console.log("🔄 Verifying ChatGPT web access token...");

    try {
        const response = await fetch('https://chatgpt.com/backend-api/payments/customer_portal', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Referer': 'https://chatgpt.com/',
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log("✅ ChatGPT web access token is valid.");
            return true;
        } else {
            console.warn(`⚠️ ChatGPT web access token is invalid (HTTP ${response.status}). Falling back to cookies...`);
            return false;
        }
    } catch (error) {
        console.warn("⚠️ Error verifying ChatGPT web access token:", error.message);
        return false;
    }
}

async function getChatGptAccessToken(page) {
    if (process.env.CHAT_GPT_ACCESS_TOKEN) {
        console.log("✅ Found access token in ENV, verifying...");

        const isValid = await verifyAccessToken(process.env.CHAT_GPT_ACCESS_TOKEN);
        if (isValid) {
            return process.env.CHAT_GPT_ACCESS_TOKEN;
        }
    }

    console.log("🔄 Access token not found or invalid. Using cookies...");
    await loadCookies(page);

    console.log("✅ Navigating to ChatGPT to extract access token...");
    await page.goto('https://chat.openai.com/', { waitUntil: 'networkidle2' });

    const accessToken = await page.evaluate(() => {
        return window.__reactRouterContext?.state?.loaderData?.root?.clientBootstrap?.session?.accessToken;
    });

    if (!accessToken) {
        console.error("❌ Failed to retrieve ChatGPT web access token.");
        process.exit(1);
    }

    console.log("✅ Extracted ChatGPT Web Access Token:", accessToken);
    return accessToken;
}


async function waitForFileDownload(downloadDir, timeout = 30_000) {
    console.log("⏳ Monitoring download directory...");

    const startTime = Date.now();
    let downloadedFile = null;

    while (Date.now() - startTime < timeout) {
        const files = fs.readdirSync(downloadDir)
            .filter(file => file.endsWith('.pdf'))
            .map(file => path.join(downloadDir, file));

        if (files.length > 0) {
            downloadedFile = files[0];
            console.log(`✅ Invoice detected: ${downloadedFile}`);
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!downloadedFile) {
        throw new Error("❌ Download timed out!");
    }

    console.log("⏳ Verifying file integrity...");
    let lastSize = 0;
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const stats = fs.statSync(downloadedFile);
        if (stats.size > 0 && stats.size === lastSize) {
            console.log("✅ Download complete!");
            break;
        }
        lastSize = stats.size;
    }

    return downloadedFile;
}


async function getInvoicePortalUrl(accessToken) {
    console.log("🔄 Fetching invoice portal URL...");
    try {
        const response = await fetch('https://chatgpt.com/backend-api/payments/customer_portal', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Referer': 'https://chatgpt.com/',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.url) {
            throw new Error("Invoice portal URL is empty.");
        }

        console.log("✅ Invoice Portal URL:", data.url);
        return data.url;
    } catch (error) {
        console.error("❌ Failed to fetch invoice portal URL:", error.message);
        return null;
    }
}

async function getFirstInvoiceUrl(page, invoicePortalUrl) {
    console.log("🔄 Navigating to invoice portal...");
    await page.goto(invoicePortalUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('a[data-testid="hip-link"]');

    const firstInvoiceUrl = await page.evaluate(() => {
        return document.querySelector('a[data-testid="hip-link"]')?.href || null;
    });

    if (!firstInvoiceUrl) {
        console.error("❌ No invoice link found.");
        return null;
    }

    console.log("✅ First Invoice URL:", firstInvoiceUrl);
    return firstInvoiceUrl;
}

async function downloadInvoice(browser, invoiceUrl, invoicesDir) {
    console.log("🔄 Opening invoice page...");
    const invoicePage = await browser.newPage();

    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const cdp = await invoicePage.target().createCDPSession();
    await cdp.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: invoicesDir
    });

    await invoicePage.goto(invoiceUrl, { waitUntil: 'networkidle2' });

    console.log("🔄 Waiting for download button...");
    await invoicePage.waitForSelector('button.Button--primary', { visible: true });

    await invoicePage.click('button.Button--primary');

    console.log("⏳ Waiting for the invoice to be downloaded...");
    return invoicesDir;
}

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage'
        ]
    });

    const page = await browser.newPage();
    const accessToken = await getChatGptAccessToken(page);

    if (!accessToken) {
        console.error("No Access Token");
        await browser.close();
        return;
    }

    const invoicePortalUrl = await getInvoicePortalUrl(accessToken);
    if (!invoicePortalUrl) {
        await browser.close();
        return;
    }

    const firstInvoiceUrl = await getFirstInvoiceUrl(page, invoicePortalUrl);
    if (!firstInvoiceUrl) {
        await browser.close();
        return;
    }

    const invoicesDir = path.join(__dirname, 'invoices');
    await downloadInvoice(browser, firstInvoiceUrl, invoicesDir);

    try {
        const downloadedFile = await waitForFileDownload(invoicesDir);
        console.log(`✅ Invoice saved as: ${downloadedFile}`);
    } catch (error) {
        console.error(error.message);
    }

    await browser.close();
})();
