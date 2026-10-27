# ShopIt: Stored Cross-Site Scripting (XSS)

ShopIt is a simple e-commerce application developed to demonstrate **Stored Cross-Site Scripting (XSS)** and compare vulnerable and secure approaches to handling user-generated content. It features a product page, shopping cart controls, and a customer review system.

## What It Does

The application provides two routes: a Secure page and an Unsecure Demo page. Users can submit product reviews containing a name, rating, and comment. Reviews persist in a SQLite database and are retrieved through a REST API.

The Secure page displays review comments as plain text, while the Unsecure Demo page intentionally interprets comments as HTML. A crafted review can therefore execute JavaScript when rendered by the vulnerable route, potentially modifying visible page content. This comparison demonstrates why untrusted user input should not be interpreted as HTML without appropriate sanitization.

## How It Works

The frontend is built with React and Vite, while the backend uses Node.js and Express. Review submissions are sent to the backend through a REST API, validated, and stored in SQLite. When a page loads, the frontend fetches the saved reviews.

The Secure route uses React's standard text rendering, which treats review comments as text. The Unsecure route uses `dangerouslySetInnerHTML` to interpret comments as HTML. Consequently, a crafted review can execute JavaScript when rendered by the vulnerable route, including DOM manipulation such as changing visible reviews or product information.

## Technology Stack

- **Frontend:** React, Vite, React Router
- **Backend:** Node.js, Express
- **Database:** SQLite (`better-sqlite3`)
- **Communication:** REST API, JSON

## Project Structure

```text
shopit/
├── data/                    
├── public/
│   ├── favicon.svg
│   └── laptop.png
├── server/
│   ├── database.js          
│   └── index.js             
├── src/
│   ├── pages/
│   │   ├── SecurePage.jsx
│   │   ├── ShopPage.jsx     
│   │   └── UnsecurePage.jsx
│   ├── App.css
│   ├── App.jsx              
│   ├── index.css
│   └── main.jsx

```

## Development

Install dependencies and start both the Vite frontend and Express API:

```sh
npm install
npm run dev:full
```

The frontend is available at `http://localhost:5173`; the API listens at `http://localhost:3001` by default. Vite proxies `/api` requests to the API. The backend port can be overridden with the `PORT` environment variable; update the Vite proxy target to match if you use a different port.

To start only the backend, run `npm run server`. SQLite creates `data/shopit.db` automatically. Run `npm run build` to create the production frontend bundle.

> **Local educational use only:** The Unsecure Demo route is intentionally vulnerable. Run it only in an isolated local environment and do not expose it to a network.