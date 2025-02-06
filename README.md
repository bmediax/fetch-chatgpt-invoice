# **Fetch ChatGPT Invoice**  

A simple script to **automate fetching invoices** from your ChatGPT subscription.  

## **🔹 How It Works**  
The script **authenticates with ChatGPT** and downloads invoices using:  
1. **Access Token (Recommended)** – Extract it manually and set it as an environment variable.  
2. **Cookies** – Use browser cookies to authenticate automatically.  

If an **Access Token is provided**, we **verify it first**:  
- ✅ If valid → The script uses it.  
- ❌ If invalid → Falls back to using **cookies**.  
- ❌ If no **Access Token** and no **cookies** → **Script won’t work.**  

---

## **🔑 Option 1: Use an Access Token (Recommended)**  
To manually obtain the **ChatGPT Access Token**:  
1. **Log in to** [ChatGPT](https://chat.openai.com/).  
2. Open **Developer Console** (`F12` → Console).  
3. Run the following command:  
   ```javascript
   window.__reactRouterContext?.state?.loaderData?.root?.clientBootstrap?.session?.accessToken
   ```
4. Copy the token and set it as an environment variable:  
   ```sh
   export CHAT_GPT_ACCESS_TOKEN="your-access-token"
   ```
   _For Windows (PowerShell)_:  
   ```powershell
   $env:CHAT_GPT_ACCESS_TOKEN="your-access-token"
   ```

---

## **🍪 Option 2: Use Cookies (Alternative Method)**  
If you prefer using **cookies** instead of an access token:  
1. **Extract ChatGPT cookies** using a browser extension:  
   - We recommend **[EditThisCookie (V3)](https://chromewebstore.google.com/detail/editthiscookie-v3/ojfebgpkimhlhcblbalbfjblapadhbol)**, but any cookie manager works.  
2. Copy the cookies and save them as **JSON** in one of two places:  
   - **Environment Variable:**  
     ```sh
     export COOKIES_JSON="$(cat cookies.json)"
     ```
   - **File:** Save cookies as `cookies.json` in the project directory.  

If **no access token** is provided, the script will:  
- First **check cookies in `COOKIES_JSON` env var**.  
- If not found, **try reading `cookies.json` file**.  
- If no cookies → **Login fails, and the script won’t work**.

---

## **🚀 How to Run**
1. Install dependencies:  
   ```sh
   npm install
   ```
2. Run the script:  
   ```sh
   node index.js
   ```
   _or if you prefer:_  
   ```sh
   npm start
   ```

---

## **📟 Example Output**
When running inside GitHub Actions or locally, the output should look like this:

```sh
$ npm start 

> fetch-chat-gpt-invoice@X.Y.Z start
> node index.js

✅ Found access token in ENV, verifying...
🔄 Verifying ChatGPT web access token...
✅ ChatGPT web access token is valid.
🔄 Fetching invoice portal URL...
✅ Invoice Portal URL: https://pay.openai.com/p/session/********
🔄 Navigating to invoice portal...
✅ First Invoice URL: https://invoice.stripe.com/i/acct_********
🔄 Opening invoice page...
🔄 Waiting for download button...
⏳ Waiting for the invoice to be downloaded...
⏳ Monitoring download directory...
✅ Invoice detected: /invoices/Invoice-XXXXXXXX-XXXX.pdf
⏳ Verifying file integrity...
✅ Download complete!
✅ Invoice saved as: /invoices/Invoice-XXXXXXXX-XXXX.pdf
```

---

## **📌 Summary**
| Method       | Works If...                            | Steps to Set Up |
|-------------|------------------------------------|----------------|
| **Access Token (Recommended)** | You manually extract it and set it in `CHAT_GPT_ACCESS_TOKEN`. | Get from **Developer Console** & set env var. |
| **Cookies** | You save ChatGPT cookies in `COOKIES_JSON` (env var) or `cookies.json` (file). | Use **EditThisCookie (V3)** or another method. |

**🔥 If no token or cookies are found → The script cannot authenticate! 🔥**  

---

### **💡 Need Help?**
Feel free to **open an issue** or reach out! 🚀  
