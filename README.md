# 🚀 Website Analysis API

A powerful REST API for intelligent website analysis and content enhancement. Extract brand information, descriptions, and enhance content using Google's Gemini AI for better readability and professionalism.

## ✨ Features

### 🔍 **Smart Website Analysis**
- **Automated Content Extraction**: Extract brand names, descriptions, and metadata from any website
- **Robust Scraping Engine**: Built with Puppeteer for reliable content extraction
- **Error Handling**: Comprehensive error categorization and user-friendly messages

### 🤖 **AI-Powered Enhancement**
- **Google Gemini Integration**: Leverage Google's Gemini 1.5 Flash model for content enhancement
- **Intelligent Description Improvement**: Automatically enhance website descriptions for clarity and professionalism
- **Fallback Mechanisms**: Graceful fallback to basic enhancement when AI is unavailable

### 🛡️ **Enterprise-Ready Security**
- **Rate Limiting**: Configurable rate limits for different endpoints
- **Input Validation**: Comprehensive validation using express-validator
- **Error Handling**: Structured error responses with detailed logging

### 📊 **Full CRUD Operations**
- **Create**: Analyze and store new website data
- **Read**: Retrieve individual or multiple website records
- **Update**: Modify existing website information
- **Delete**: Remove website records
- **Enhance**: AI-enhance existing descriptions

## 🏗️ Architecture

```
├── src/
│   ├── index.js                 # Application entry point
│   ├── supabaseClient.js        # Database connection
│   ├── database/
│   │   └── schema.js           # Database schema validation
│   ├── middleware/
│   │   ├── errorHandler.js     # Global error handling
│   │   ├── RateLimit.js        # Rate limiting configuration
│   │   └── validation.js       # Input validation rules
│   ├── routes/
│   │   └── websiteRoutes.js    # API route definitions
│   ├── services/
│   │   ├── scrapingService.js  # Web scraping logic
│   │   └── aiEnhancementService.js # AI enhancement service
│   └── utils/
│       └── logger.js           # Logging utility
└── logs/                       # Application logs
    ├── info.log
    └── error.log
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **Supabase** account and project
- **Google AI Studio** API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SubhPanda04/Nurdd.git
   cd Nurdd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3000
   ```

4. **Database Setup**
   
   Create the following table in your Supabase SQL editor:
   ```sql
   CREATE TABLE website_analysis (
     id SERIAL PRIMARY KEY,
     url VARCHAR(500) NOT NULL,
     brand_name VARCHAR(255),
     description TEXT,
     raw_description TEXT,
     enhanced BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api/websites
```

### 🔍 **Analyze Website**
```http
POST /analyze
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "enhanceDescription": true
}
```

**Response:**
```json
{
  "message": "Website analyzed successfully",
  "data": {
    "id": 1,
    "url": "https://example.com",
    "brand_name": "Example Corp",
    "description": "Enhanced professional description...",
    "raw_description": "Original extracted description...",
    "enhanced": true,
    "created_at": "2025-08-17T10:30:00Z",
    "aiStats": {
      "enabled": true,
      "model": "gemini-1.5-flash",
      "fallbackMode": false
    }
  }
}
```

### 📋 **Get All Records**
```http
GET /
```

**Response:**
```json
{
  "message": "Website records retrieved successfully",
  "count": 10,
  "data": [...]
}
```

### 🔎 **Get Single Record**
```http
GET /:id
```

### ✏️ **Update Record**
```http
PUT /:id
```

**Request Body:**
```json
{
  "brand_name": "Updated Brand Name",
  "description": "Updated description..."
}
```

### 🗑️ **Delete Record**
```http
DELETE /:id
```

### 🤖 **Enhance Existing Description**
```http
POST /:id/enhance
```

### 📊 **AI Service Status**
```http
GET /ai/status
```

**Response:**
```json
{
  "message": "AI enhancement status",
  "enabled": true,
  "model": "gemini-1.5-flash",
  "fallbackMode": false,
  "features": {
    "enhanceDescription": true,
    "supportedLanguages": ["en"],
    "maxDescriptionLength": 1000
  }
}
```

## 🛠️ Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | 20.x |
| **Express.js** | Web Framework | 4.18 |
| **Puppeteer** | Web Scraping | 24.16 |
| **Cheerio** | HTML Parsing | 1.1 |
| **Supabase** | Database & Backend | 2.55 |
| **Google Gemini** | AI Enhancement | 1.5-flash |
| **Express Validator** | Input Validation | 7.2 |
| **Express Rate Limit** | Rate Limiting | 8.0 |

## 🔧 Configuration

### Rate Limiting
- **Analysis Endpoint**: 20 requests per 10 minutes
- **General Endpoints**: 100 requests per 15 minutes


## 🔐 Security Features

- **Input Validation**: All inputs validated using express-validator
- **Rate Limiting**: Prevent API abuse with configurable limits
- **Error Sanitization**: Sensitive information filtered from error responses
- **CORS Enabled**: Cross-origin requests properly configured
- **Request Timeout**: Prevents hanging requests

<div align="center">
  <strong>Made with ❤️ for intelligent web analysis</strong>
</div>
