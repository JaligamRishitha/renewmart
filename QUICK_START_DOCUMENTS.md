# Quick Start - Document Storage & Upload

## What Was Fixed?

Your document storage system is now **fully functional**! 🎉

- ✅ Documents save to `backend/uploads/documents/` folder
- ✅ Database and code schemas now match perfectly
- ✅ All API endpoints work correctly
- ✅ Files are organized by land/project ID

---

## How to Test

### Option 1: Automated Test Script (Recommended)

1. **Start Backend**:
   ```bash
   cd renewmart/backend
   python server.py
   ```

2. **Run Test** (in a new terminal):
   ```bash
   cd renewmart/backend
   python test_document_upload.py
   ```

3. **Check Results**:
   - Test will create a land, upload a document, and verify storage
   - Check `backend/uploads/documents/` folder for saved files

### Option 2: Manual Testing via Frontend

1. **Start Backend & Frontend**:
   ```bash
   # Terminal 1 - Backend
   cd renewmart/backend
   python server.py

   # Terminal 2 - Frontend
   cd renewmart/frontend
   npm run dev
   ```

2. **Login** as a landowner user

3. **Create/View a Project**:
   - Go to landowner dashboard
   - Open an existing project or create new one

4. **Upload Document**:
   - Navigate to document upload page
   - Select a file (PDF, DOC, JPG, etc.)
   - Choose document type (feasibility, ownership_deed, etc.)
   - Click upload

5. **Verify**:
   - Check `backend/uploads/documents/{land_id}/` folder
   - File should be there with a UUID name

### Option 3: API Testing with Postman/Thunder Client

1. **Login**:
   ```http
   POST http://localhost:8000/api/users/login
   Content-Type: application/json

   {
     "email": "landowner@renewmart.com",
     "password": "Land2024!"
   }
   ```
   Copy the `access_token` from response.

2. **Create a Land** (if you don't have one):
   ```http
   POST http://localhost:8000/api/lands/
   Authorization: Bearer YOUR_TOKEN

   {
     "title": "My Test Land",
     "location_text": "Test City, TX",
     "coordinates": {"lat": 30.27, "lng": -97.74},
     "area_acres": 100
   }
   ```
   Copy the `land_id` from response.

3. **Upload Document**:
   ```http
   POST http://localhost:8000/api/documents/upload/{land_id}
   Authorization: Bearer YOUR_TOKEN
   Content-Type: multipart/form-data

   Form Data:
   - file: (select a file)
   - document_type: feasibility
   ```

4. **Check Upload Directory**:
   ```bash
   ls backend/uploads/documents/{land_id}/
   ```

---

## Where Files Are Stored

```
renewmart/backend/
└── uploads/
    └── documents/
        ├── {land-id-1}/
        │   ├── abc123...xyz.pdf
        │   ├── def456...xyz.jpg
        │   └── ...
        ├── {land-id-2}/
        │   └── ...
        └── ...
```

**File Naming**:
- Original name stored in database (`file_name` field)
- Physical file has UUID name to prevent conflicts
- Example: `a1b2c3d4-e5f6-4789-0abc-def123456789.pdf`

---

## Supported File Types

- **Documents**: `.pdf`, `.doc`, `.docx`, `.txt`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.tiff`
- **Max Size**: 10MB per file

---

## Document Types

When uploading, specify one of these types:
- `ownership_deed` - Property ownership documents
- `survey` - Land survey documents
- `grid_letter` - Grid connectivity letters
- `feasibility` - Feasibility studies
- `PPA` - Power Purchase Agreements
- `SLA` - Service Level Agreements
- `Env_Clearance` - Environmental clearances
- Or any custom type

---

## Troubleshooting

**"Land not found" error?**
- Make sure you're using a valid land_id
- Check that the land belongs to your user

**"Permission denied" error?**
- Only land owners and administrators can upload
- Verify you're logged in with the correct account

**Files not appearing?**
- Check if `backend/uploads/documents` folder exists
- It's created automatically on first upload
- Check file permissions on the uploads folder

**Large file fails?**
- Max size is 10MB
- Compress or split the file if larger

---

## API Endpoints

All endpoints available at `/docs` when backend is running:
- `POST /api/documents/upload/{land_id}` - Upload document
- `GET /api/documents/land/{land_id}` - Get all documents for a land
- `GET /api/documents/{document_id}` - Get document details
- `GET /api/documents/download/{document_id}` - Download document file
- `GET /api/documents/my/uploads` - Get all your uploaded documents
- `DELETE /api/documents/{document_id}` - Delete document
- `PUT /api/documents/{document_id}` - Update document metadata

---

## What's Next?

Try uploading different file types and verify they're saved correctly!

1. Login to your landowner account
2. Create or select a project
3. Upload some test documents
4. Check the `uploads/documents` folder
5. Try downloading the documents

---

## Need Help?

See the complete documentation:
- **Full Details**: `DOCUMENT_STORAGE_FIXED.md`
- **API Docs**: http://localhost:8000/docs (when backend is running)

---

**Status**: ✅ Ready to use!  
**Test it now**: `python backend/test_document_upload.py`

