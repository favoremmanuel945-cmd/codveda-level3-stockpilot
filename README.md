# StockPilot

**Inventory. Sales. Clarity.**

StockPilot is a full-stack inventory and sales management application designed to help businesses manage products, track stock levels, record transactions, and understand sales performance through a responsive dashboard.

Developed as part of the **Codveda Technologies Level 3 — Advanced Web Development Internship**.

## Live Application

**Frontend:** https://codveda-level3-stockpilot.vercel.app

**Backend health endpoint:** https://stockpilot-api-wdie.onrender.com/api/health

## Features

### Authentication
- User registration and login
- Password hashing
- JWT-based authentication
- Protected application routes
- Persistent authentication sessions
- Secure production cookies

### Inventory Management
- Add products
- View product inventory
- Edit product information
- Delete products
- Search and filter inventory
- Monitor stock quantities
- Configure low-stock thresholds

### Sales Management
- Record sales transactions
- Automatically update inventory quantities
- Track total revenue and units sold
- View transaction history
- Preserve historical transaction prices

### Analytics Dashboard
- Revenue overview
- Sales trends
- Average transaction value
- Top-selling products
- Inventory health and low-stock indicators

### User Experience
- Responsive desktop and mobile layouts
- Dashboard navigation
- Form validation and feedback messages
- Loading and error states
- Clean, business-focused interface

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL, Supabase |
| Authentication | JWT, HTTP-only cookies |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Version Control | Git, GitHub |

## Project Structure

- `client/` — React frontend
- `server/` — Express backend
- `database/` — PostgreSQL schema

## Local Development

1. Clone the GitHub repository.
2. Install dependencies in `client` and `server`.
3. Configure `server/.env` using `server/.env.example`.
4. Start the backend using `npm start` from `server`.
5. Start the frontend using `npm run dev` from `client`.

Do not commit environment variables, passwords, or API secrets.

## Deployment

- Frontend: Vercel
- Backend: Render
- Database: Supabase PostgreSQL

## Testing

Verified workflows include authentication, session persistence,
inventory management, sales recording, historical transaction
prices, analytics, and mobile responsiveness.

## Author

**Emmanuel Favor**

GitHub: https://github.com/favoremmanuel945-cmd

LinkedIn: https://www.linkedin.com/in/emmanuelfavor

## Status

Deployed and undergoing final Codveda Level 3 submission review.
