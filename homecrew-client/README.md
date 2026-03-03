# HomeCrew Frontend

একটি modern React-based frontend application যা HomeCrew household service platform এর জন্য তৈরি করা হয়েছে।

## Features

✅ **User Authentication**
- Register new account
- Login/Logout
- JWT token based authentication
- Profile management

✅ **Service Management**
- Browse all services
- Filter by category
- Search services
- View service details
- See service reviews and ratings
- Write reviews

✅ **Shopping Cart**
- Add services to cart
- Update quantity
- Remove items
- View subtotal and total

✅ **Order Management**
- Place orders
- View order history
- Track order status

✅ **User Profile**
- View and edit personal information
- Update contact details

## Tech Stack

- **React 18** - UI Framework
- **React Router** - Routing
- **Axios** - HTTP Client
- **Context API** - State Management
- **Vite** - Build Tool

## Installation

```bash
cd homecrew-client
npm install
```

## Running the Application

### Development Mode

```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── api/
│   └── axios.js          # API configuration with interceptors
├── context/
│   ├── AuthContext.jsx   # Authentication state management
│   └── CartContext.jsx   # Shopping cart state management
├── components/
│   └── Navbar.jsx        # Navigation component
├── pages/
│   ├── Home.jsx          # Landing page
│   ├── Login.jsx         # Login page
│   ├── Register.jsx      # Registration page
│   ├── Services.jsx      # Services listing
│   ├── ServiceDetail.jsx # Service details with reviews
│   ├── Cart.jsx          # Shopping cart
│   ├── Orders.jsx        # Order history
│   └── Profile.jsx       # User profile
├── App.jsx               # Main app component with routing
└── main.jsx              # Entry point
```

## API Configuration

Backend API URL is configured in `src/api/axios.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000/api/v1';
```

Change this URL if your backend is running on a different port or domain.

## Available Routes

- `/` - Home page
- `/login` - Login page
- `/register` - Registration page
- `/services` - Browse services
- `/services/:id` - Service detail page
- `/cart` - Shopping cart
- `/orders` - Order history
- `/profile` - User profile

## Features in Detail

### Authentication
- JWT tokens are stored in localStorage
- Automatic token refresh on expiry
- Protected routes redirect to login
- Logout clears tokens and redirects to home

### Shopping Cart
- Persists in backend (not localStorage)
- Real-time quantity updates
- Shows total with tax calculation
- One-click checkout

### Services
- Filter by category
- Search by name/description
- View ratings and reviews
- Add reviews after purchase

## Running with Backend

Make sure your Django backend is running:

```bash
# In the backend directory
python manage.py runserver
```

Then start the frontend:

```bash
# In homecrew-client directory
npm run dev
```

## Environment Variables (Optional)

Create a `.env` file in `homecrew-client/` directory:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Then update `src/api/axios.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
```

## Notes

- Make sure the backend is running before starting the frontend
- Default backend URL is `http://localhost:8000/api/v1`
- First register a user, then login to access full features
- Cart and orders require authentication

## Developed By

HomeCrew Team
