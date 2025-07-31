# CampusConnect Backend API

A comprehensive backend API for CampusConnect, a campus lost and found application that helps students report, search, and claim lost items on campus.

## 🚀 Features

- **User Authentication**: JWT-based authentication with registration, login, and password reset
- **Item Management**: Create, read, update, delete lost and found items
- **Image Upload**: Cloudinary integration for item images with automatic optimization
- **Search & Filter**: Advanced search and filtering capabilities
- **Security**: Rate limiting, CORS, helmet security headers, and input validation
- **Statistics**: Dashboard statistics for items and user activities
- **Real-time Notifications**: Email notifications for important events

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Cloudinary via Multer
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Email**: Nodemailer

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campusconnect-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Copy the `.env.example` file to `.env` and fill in your configuration:
   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/campusconnect

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d

   # Cloudinary Configuration (for image uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Email Configuration (optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_app_password

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

4. **Database Setup**
   
   Ensure MongoDB is running. The application will automatically create the necessary collections and indexes.

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or your specified PORT).

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@university.edu",
  "password": "password123",
  "studentId": "STU12345",
  "phoneNumber": "555-1234",
  "department": "Computer Science",
  "year": "Junior"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@university.edu",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### Item Endpoints

#### Get All Items
```http
GET /api/items?page=1&limit=10&type=lost&category=Electronics&search=laptop
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `type`: lost or found
- `category`: Item category
- `search`: Text search
- `building`: Filter by building
- `sortBy`: newest, oldest, date-newest, date-oldest, views, urgent

#### Get Single Item
```http
GET /api/items/:id
```

#### Create Item
```http
POST /api/items
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "title": "Lost iPhone 13",
  "description": "Black iPhone 13 with cracked screen",
  "category": "Electronics",
  "type": "lost",
  "location": {
    "building": "Student Union",
    "room": "Main Hall",
    "description": "Near the coffee shop"
  },
  "dateTime": "2024-01-15T14:30:00Z",
  "images": [file1, file2] // File upload
}
```

#### Update Item
```http
PUT /api/items/:id
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Delete Item
```http
DELETE /api/items/:id
Authorization: Bearer <jwt_token>
```

#### Claim Item
```http
PUT /api/items/:id/claim
Authorization: Bearer <jwt_token>
```

#### Get User's Items
```http
GET /api/items/user/my-items?page=1&status=active
Authorization: Bearer <jwt_token>
```

#### Get Statistics
```http
GET /api/items/stats
```

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers for common vulnerabilities
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Image type validation and size limits

## 📁 Project Structure

```
campusconnect-backend/
├── config/
│   └── database.js          # Database connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── itemController.js    # Item management logic
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── security.js         # Security middleware
│   └── upload.js           # File upload middleware
├── models/
│   ├── User.js             # User schema
│   ├── Item.js             # Item schema
│   └── Report.js           # Report schema
├── routes/
│   ├── auth.js             # Authentication routes
│   └── items.js            # Item routes
├── .env.example            # Environment variables template
├── package.json            # Dependencies and scripts
├── server.js               # Main application file
└── README.md               # Project documentation
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 🐛 Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## 📊 Monitoring

### Health Check
```http
GET /health
```

Returns server status and version information.

### Logging

The application logs:
- Request/response information
- Error details
- Database connection status
- Performance metrics

## 🚀 Deployment

### Environment Variables for Production

Set `NODE_ENV=production` and ensure all required environment variables are configured.

### MongoDB Atlas Setup

1. Create a MongoDB Atlas cluster
2. Get your connection string
3. Update `MONGODB_URI` in your environment variables

### Cloudinary Setup

1. Create a Cloudinary account
2. Get your cloud name, API key, and API secret
3. Update the Cloudinary environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
  - User authentication
  - Item management
  - Image upload
  - Search and filtering
  - Security features