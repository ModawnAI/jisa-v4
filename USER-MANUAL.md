# ContractorHub User Manual

> A KakaoTalk Chatbot-Based Contractor Compensation Calculation and Onboarding System with RAG-Powered Document Querying

**Version**: 1.0
**Last Updated**: December 2024

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard](#3-dashboard)
4. [Employee Management](#4-employee-management)
5. [Document Management](#5-document-management)
6. [RAG System](#6-rag-system)
7. [System Administration](#7-system-administration)
8. [Roles and Permissions](#8-roles-and-permissions)
9. [Troubleshooting](#9-troubleshooting)
10. [Appendix](#10-appendix)

---

## 1. Introduction

### 1.1 What is ContractorHub?

ContractorHub is an enterprise-grade document management and AI-powered query system designed specifically for contractor and employee compensation management. The system combines:

- **Document Processing**: Upload and process Excel, CSV, PDF, and Word documents
- **RAG (Retrieval-Augmented Generation)**: AI-powered natural language querying of your document knowledge base
- **Vector Search**: Semantic search powered by Pinecone with OpenAI embeddings
- **Access Control**: Role-based permissions with document clearance levels
- **KakaoTalk Integration**: Chatbot interface for employee self-service queries

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Smart Document Processing** | Automatic parsing, chunking, and vectorization of uploaded documents |
| **Template-Based Parsing** | Define how Excel/CSV files should be processed with column mappings |
| **Multi-Level Access Control** | Basic, Standard, and Advanced clearance levels for document access |
| **AI Chat Interface** | Natural language queries against your document knowledge base |
| **Data Lineage Tracking** | Full traceability from vectors back to source documents |
| **Conflict Detection** | Automatic detection and resolution of document conflicts |
| **Audit Logging** | Complete activity tracking for compliance |

### 1.3 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  Dashboard │ Employees │ Documents │ Chat │ Admin Settings  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Supabase   │   Pinecone   │   OpenAI     │    Gemini      │
│   (Database) │   (Vectors)  │  (Embeddings)│    (LLM)       │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 2. Getting Started

### 2.1 Accessing the Application

1. **Open your web browser** (Chrome, Firefox, Safari, or Edge recommended)
2. **Navigate to the application URL** provided by your administrator
3. You will be redirected to the login page if not authenticated

### 2.2 Logging In

The login page presents a simple authentication form.

#### Step-by-Step Login Process

1. **Enter your email address** in the "이메일" (Email) field
2. **Enter your password** in the "비밀번호" (Password) field
3. **Click the "로그인" (Login) button**
4. Upon successful authentication, you will be redirected to the Dashboard

#### Test Credentials

For testing purposes, use the following credentials:
- **Email**: `asdf@asdf.com`
- **Password**: `asdfasdfasdf`

#### Login Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "유효한 이메일을 입력하세요" | Invalid email format | Enter a valid email address |
| "비밀번호는 6자 이상이어야 합니다" | Password too short | Password must be at least 6 characters |
| "로그인에 실패했습니다" | Wrong credentials | Verify email and password |

### 2.3 Navigation Structure

After logging in, you'll see a sidebar on the left with the following navigation structure:

```
┌─────────────────────────────────────┐
│  ContractorHub                      │
├─────────────────────────────────────┤
│  📊 대시보드 (Dashboard)             │
├─────────────────────────────────────┤
│  👥 직원 관리 (Employee Management)  │
│     └─ 직원 목록 (Employee List)     │
├─────────────────────────────────────┤
│  📁 문서 관리 (Document Management)  │
│     ├─ 카테고리 (Categories)         │
│     ├─ 템플릿 (Templates)            │
│     ├─ 문서 업로드 (Document Upload) │
│     └─ 문서 목록 (Document List)     │
├─────────────────────────────────────┤
│  🤖 RAG 시스템 (RAG System)          │
│     ├─ AI 채팅 (AI Chat)             │
│     └─ 데이터 계보 (Data Lineage)    │
├─────────────────────────────────────┤
│  ⚙️ 시스템 (System)                  │
│     ├─ 분석 (Analytics)              │
│     ├─ 설정 (Settings)               │
│     └─ 보안 (Security)               │
└─────────────────────────────────────┘
```

> **Note**: Menu items are permission-based. You may not see all items depending on your role.

### 2.4 Understanding the Interface

#### Header Bar
- **User Profile**: Click on your profile in the top-right corner to access account settings or logout
- **Notifications**: System notifications appear in the header area

#### Main Content Area
- **Page Header**: Shows the current page title and description
- **Action Buttons**: Primary actions (like "Add New") appear in the top-right of the page header
- **Content Cards**: Data is organized in cards with clear visual hierarchy

#### Common UI Patterns
- **Tables**: Sortable, filterable data tables with pagination
- **Forms**: Validated input forms with clear error messages
- **Modals**: Popup dialogs for confirmations and quick actions
- **Toast Notifications**: Brief messages that appear at the bottom of the screen

---

## 3. Dashboard

### 3.1 Overview

The Dashboard is your command center, providing a real-time overview of the entire system's health and activity.

**Navigation**: Sidebar → 대시보드 (Dashboard)

### 3.2 Statistics Cards

The top section displays six key performance indicators:

| Statistic | Korean Label | Description | What to Monitor |
|-----------|--------------|-------------|-----------------|
| **Total Employees** | 전체 직원 | Total registered employees | Shows active count in description |
| **Total Documents** | 전체 문서 | All uploaded documents | Shows processed count; watch for pending |
| **Vector Count** | 벡터 수 | Vectors stored in Pinecone | Indicates knowledge base size |
| **Processing Rate** | 처리율 | Document processing success % | Alert if below 90% |
| **Pending Conflicts** | 대기 충돌 | Unresolved document conflicts | Should be kept at 0 |
| **Storage Used** | 스토리지 | Storage consumption in MB | Monitor for capacity planning |

#### Understanding Trends

Each stat card may show a trend indicator:
- **Red downward arrow**: Negative trend requiring attention
- **Green upward arrow**: Positive trend
- **No indicator**: Stable or neutral

### 3.3 Charts Section

#### Processing Chart
A visual representation of document processing activity over time:
- **X-axis**: Time period (days/weeks)
- **Y-axis**: Number of documents processed
- **Use case**: Identify processing patterns and peak usage times

#### Status Breakdown
A pie or bar chart showing document status distribution:
- **Completed**: Successfully processed documents
- **Processing**: Currently being processed
- **Pending**: Waiting in queue
- **Failed**: Processing errors occurred

### 3.4 Recent Activity

A chronological list of recent system events:
- User logins and logouts
- Document uploads and processing
- Employee record changes
- System configuration updates

Each activity entry shows:
- **Action type**: What happened
- **Subject**: What was affected
- **Timestamp**: When it occurred
- **User**: Who performed the action (if applicable)

### 3.5 Quick Actions

Shortcut buttons for frequently used functions:
- **Upload Document**: Jump directly to document upload
- **Add Employee**: Create a new employee record
- **View Conflicts**: Check pending conflicts
- **AI Chat**: Start a new AI chat session

---

## 4. Employee Management

### 4.1 Overview

The Employee Management module allows you to maintain a comprehensive database of all employees/contractors in your organization. Each employee record is linked to their document access permissions and personal document namespace.

**Navigation**: Sidebar → 직원 관리 → 직원 목록

### 4.2 Employee List Page

#### Filtering Options

The filter bar at the top provides multiple ways to narrow down the employee list:

| Filter | Description | Options |
|--------|-------------|---------|
| **Search** | Text search | Searches name, employee ID, and email |
| **Status** | Employment status | Active (재직), Inactive, On Leave, etc. |
| **Department** | Department filter | Lists all departments in use |
| **Clearance Level** | Document access level | Basic, Standard, Advanced |

#### Table Columns

| Column | Korean | Description |
|--------|--------|-------------|
| Employee ID | 사번 | Unique identifier (e.g., EMP001) |
| Name | 이름 | Employee's full name |
| Email | 이메일 | Contact email address |
| Department | 부서 | Department/team name |
| Position | 직급 | Job title/position |
| Clearance | 권한 레벨 | Document access level |
| Status | 상태 | Current employment status |
| Actions | - | Edit, View, Delete buttons |

#### Pagination

- Default: 10 employees per page
- Navigate using page numbers at the bottom
- Total count displayed

### 4.3 Adding a New Employee

#### Step-by-Step Process

1. **Click "직원 추가" (Add Employee)** button in the top-right corner
2. **Fill in the employee form**:

| Field | Korean | Required | Description |
|-------|--------|:--------:|-------------|
| Employee ID | 사번 | ✓ | Unique identifier (cannot be changed later) |
| Name | 이름 | ✓ | Full legal name |
| Email | 이메일 | - | Work email address |
| Phone | 연락처 | - | Contact phone number |
| Department | 부서 | - | Department/team |
| Position | 직급 | - | Job title |
| Hire Date | 입사일 | - | Employment start date |
| Clearance Level | 권한 레벨 | - | Document access level (default: Basic) |

3. **Click "추가" (Add)** to save the employee

#### Clearance Levels Explained

The clearance level determines which documents an employee can access through the RAG system:

| Level | Korean | Access Scope | Use Case |
|-------|--------|--------------|----------|
| **Basic** | 기본 | Company-wide shared documents only | General employees, contractors |
| **Standard** | 표준 | Shared + Standard tier documents | Team leads, senior staff |
| **Advanced** | 고급 | All documents including confidential | Managers, HR, executives |

> **Important**: Clearance levels affect both direct document access and AI chat responses. Higher clearance = access to more sensitive information.

### 4.4 Viewing Employee Details

1. **Click on any employee row** in the list
2. The **Employee Detail Page** displays:
   - Complete employee information
   - Employment history
   - Document access statistics
   - Associated documents (if employee-specific documents exist)

### 4.5 Editing Employee Information

1. Navigate to the employee's detail page
2. Click the **"수정" (Edit)** button
3. Modify the desired fields
   - Note: Employee ID cannot be changed
4. Click **"수정" (Save)** to confirm changes

### 4.6 Employee Status Types

| Status | Korean | Description |
|--------|--------|-------------|
| Active | 재직 | Currently employed and active |
| Inactive | 비활성 | Account disabled but not terminated |
| Pending | 대기 | Awaiting onboarding completion |
| On Leave | 휴직 | Temporary leave of absence |
| Terminated | 퇴사 | Employment ended |

### 4.7 Best Practices

1. **Use consistent Employee IDs**: Establish a naming convention (e.g., EMP001, CONT-2024-001)
2. **Set appropriate clearance levels**: Start with Basic and upgrade as needed
3. **Keep information current**: Update status promptly when employees leave or change roles
4. **Use departments consistently**: Create a standard list of department names

---

## 5. Document Management

### 5.1 Overview

Document Management is the core of ContractorHub. This module handles the entire document lifecycle from upload through processing to vector storage.

### 5.2 Understanding the Document Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Upload     │ → │   Process    │ → │   Vectorize  │ → │   Query      │
│   Document   │    │   (Parse)    │    │   (Embed)    │    │   (RAG)      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
   Supabase           Template            Pinecone           AI Chat
   Storage            Matching            Namespace          Response
```

### 5.3 Categories

**Navigation**: Sidebar → 문서 관리 → 카테고리

Categories provide a hierarchical structure for organizing documents.

#### Creating a Category

1. Click **"카테고리 추가" (Add Category)**
2. Fill in the form:

| Field | Description |
|-------|-------------|
| **Name** | Category name (e.g., "Payroll Documents") |
| **Description** | Detailed description of what belongs here |
| **Parent Category** | Optional - select for nested categories |
| **Clearance Level** | Minimum access level required |

3. Click **Save**

#### Category Hierarchy Example

```
📁 Human Resources
   ├── 📁 Payroll
   │   ├── 📁 Monthly Statements
   │   └── 📁 Year-End Summaries
   ├── 📁 Contracts
   │   ├── 📁 Full-Time
   │   └── 📁 Contractors
   └── 📁 Policies
       ├── 📁 Company-Wide
       └── 📁 Department-Specific
```

#### Category Best Practices

1. **Plan your hierarchy**: Design categories before creating them
2. **Use clear names**: Make category purpose immediately obvious
3. **Set appropriate clearance**: Ensure sensitive documents require higher access
4. **Don't nest too deeply**: 3-4 levels maximum recommended

### 5.4 Templates

**Navigation**: Sidebar → 문서 관리 → 템플릿

Templates define how Excel and CSV files are parsed and processed.

#### Why Templates Matter

Different documents have different structures. A payroll spreadsheet looks different from a contract list. Templates tell the system:
- Which columns contain important data
- How to identify which employee a row belongs to
- How to chunk the data for vectorization
- Where to store the resulting vectors

#### Creating a Template

1. Click **"템플릿 추가" (Add Template)**
2. Configure the template:

**Basic Settings**:
| Field | Description |
|-------|-------------|
| **Name** | Template name (e.g., "Monthly Payroll Template") |
| **Category** | Which category documents using this template belong to |
| **Description** | Detailed description of the template's purpose |

**Processing Settings**:
| Setting | Options | Description |
|---------|---------|-------------|
| **Processing Mode** | Company / Employee Split | How to organize the data |
| **Chunking Strategy** | Auto / Row-based / Fixed / Semantic | How to split into vectors |

**Column Mappings**:

Define what each Excel column represents:

| Role | Korean | Purpose |
|------|--------|---------|
| **Employee Identifier** | 직원 식별자 | Column containing employee ID for matching |
| **Content** | 내용 | Main content to be vectorized |
| **Metadata** | 메타데이터 | Additional context information |
| **Skip** | 건너뛰기 | Ignore this column |

#### Processing Modes Explained

| Mode | Korean | Behavior | Use Case |
|------|--------|----------|----------|
| **Company** | 회사 전체 | All data goes to shared namespace | Company policies, general documents |
| **Employee Split** | 직원별 분리 | Data split by employee ID column | Payroll, personal contracts |

#### Chunking Strategies

| Strategy | Korean | Behavior |
|----------|--------|----------|
| **Auto** | 자동 | System determines best approach |
| **Row Per Chunk** | 행별 청크 | Each row becomes one vector |
| **Fixed Size** | 고정 크기 | Split by character/token count |
| **Semantic** | 의미 기반 | AI-powered semantic splitting |

### 5.5 Uploading Documents

**Navigation**: Sidebar → 문서 관리 → 문서 업로드

#### Supported File Types

| Type | Extensions | Max Size | Notes |
|------|------------|----------|-------|
| Excel | .xlsx, .xls | 50 MB | Requires template for processing |
| CSV | .csv | 50 MB | Requires template for processing |
| PDF | .pdf | 50 MB | Automatic text extraction |
| Word | .docx | 50 MB | Automatic text extraction |

#### Upload Process

1. **Navigate to Document Upload page**
2. **Drag and drop files** onto the upload zone, OR click to browse
3. **Select Category** from dropdown
4. **Select Template** (for Excel/CSV files)
5. **Click "업로드" (Upload)**

#### What Happens After Upload

1. **File Storage**: Document saved to Supabase Storage
2. **Queue**: Document added to processing queue
3. **Processing**: Background job parses the document
4. **Vectorization**: Content converted to embeddings (3072 dimensions)
5. **Storage**: Vectors stored in Pinecone with metadata
6. **Indexing**: Data lineage records created

#### Upload Limits

- **Maximum file size**: 50 MB per file
- **Maximum files per upload**: 10 files
- **Supported formats**: xlsx, xls, csv, pdf, docx

### 5.6 Document List

**Navigation**: Sidebar → 문서 관리 → 문서 목록

#### Document Table

| Column | Description |
|--------|-------------|
| **Filename** | Original uploaded filename |
| **Category** | Assigned category |
| **Template** | Processing template used |
| **Status** | Current processing status |
| **Vectors** | Number of vectors generated |
| **Uploaded** | Upload timestamp |
| **Actions** | View, Reprocess, Delete |

#### Document Statuses

| Status | Korean | Icon | Meaning |
|--------|--------|------|---------|
| **Pending** | 대기중 | ⏳ | Waiting in processing queue |
| **Processing** | 처리중 | 🔄 | Currently being processed |
| **Completed** | 완료 | ✅ | Successfully processed |
| **Failed** | 실패 | ❌ | Processing error occurred |
| **Partial** | 부분 완료 | ⚠️ | Some chunks failed |

#### Document Actions

- **View Details**: See complete document information and processing logs
- **Reprocess**: Retry processing for failed documents
- **Delete**: Remove document and all associated vectors
- **Download Original**: Get the original uploaded file

### 5.7 Document Processing Details

When you click on a document, you'll see:

1. **Basic Information**
   - Filename, size, upload date
   - Category and template used
   - Current status

2. **Processing Log**
   - Step-by-step processing history
   - Error messages (if any)
   - Processing duration

3. **Vector Information**
   - Number of chunks created
   - Namespace(s) used
   - Vector IDs for reference

4. **Data Lineage**
   - Links to lineage records
   - Source traceability

---

## 6. RAG System

### 6.1 Overview

The RAG (Retrieval-Augmented Generation) system is the AI-powered heart of ContractorHub. It enables natural language queries against your entire document knowledge base.

### 6.2 How RAG Works

```
┌─────────────────┐
│  User Question  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query Embedding │  ← OpenAI text-embedding-3-large
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vector Search   │  ← Pinecone similarity search
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Context Assembly │  ← Top-K relevant chunks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Generation  │  ← Google Gemini
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Response     │
└─────────────────┘
```

### 6.3 AI Chat Interface

**Navigation**: Sidebar → RAG 시스템 → AI 채팅

#### Chat Interface Layout

```
┌─────────────────────────────────────┬──────────────────┐
│                                     │                  │
│         Message History             │  Context Panel   │
│                                     │  (collapsible)   │
│  [User]: What was my salary in     │                  │
│          January?                   │  📄 Source 1     │
│                                     │  📄 Source 2     │
│  [AI]: Based on your January       │  📄 Source 3     │
│        payroll document...         │                  │
│                                     │                  │
├─────────────────────────────────────┤                  │
│  [Type your message...]      [Send] │                  │
└─────────────────────────────────────┴──────────────────┘
```

#### Sending Messages

1. **Type your question** in the input field at the bottom
2. **Press Enter** or click the **Send** button
3. **Wait for the response** - streaming enabled for real-time display
4. **View context sources** by clicking on the response

#### Chat Settings

Click the **gear icon** (⚙️) in the top-right to access settings:

| Setting | Korean | Default | Description |
|---------|--------|---------|-------------|
| **Include Organization** | 조직 문서 포함 | ✓ | Search company-wide shared documents |
| **Include Personal** | 개인 문서 포함 | ✓ | Search employee-specific documents |
| **Top-K** | - | 10 | Number of relevant chunks to retrieve |
| **Temperature** | - | 0.7 | AI creativity level (0=focused, 1=creative) |

#### Context Panel

When the AI responds, you can see which document chunks were used:

- **Score**: Relevance score (0-1, higher = more relevant)
- **Content**: Preview of the source text
- **Document**: Original document reference
- **Namespace**: Where the vector is stored

#### URL Parameters

You can pre-filter the chat by adding URL parameters:

```
/chat?employeeId=EMP001           # Only search this employee's documents
/chat?categoryId=abc-123          # Only search this category
/chat?employeeId=EMP001&categoryId=abc-123  # Combined filter
```

#### Example Questions

| Question Type | Example |
|---------------|---------|
| **Personal Data** | "What was my total compensation last year?" |
| **Policy Lookup** | "What is the vacation policy?" |
| **Calculation** | "How many sick days do I have remaining?" |
| **Comparison** | "Compare my Q1 and Q2 earnings" |
| **Process** | "How do I submit an expense report?" |

### 6.4 Data Lineage

**Navigation**: Sidebar → RAG 시스템 → 데이터 계보

Data Lineage provides full traceability from vectors back to source documents.

#### Why Lineage Matters

- **Auditability**: Know exactly where each piece of data came from
- **Debugging**: Trace issues back to source documents
- **Compliance**: Meet regulatory requirements for data provenance
- **Quality Control**: Verify data accuracy

#### Lineage Statistics

The statistics section shows:
- **Total Lineage Records**: All tracked data points
- **By Document**: Distribution across source documents
- **By Namespace**: Distribution across Pinecone namespaces
- **Recent Updates**: Latest lineage changes

#### Lineage Table

| Column | Description |
|--------|-------------|
| **Chunk ID** | Unique identifier for the vector chunk |
| **Source Document** | Original document filename |
| **Namespace** | Pinecone namespace (org_xxx or emp_xxx) |
| **Created** | When the vector was created |
| **Status** | Active or Deleted |

#### Lineage Actions

- **View Details**: See complete chunk content and metadata
- **Trace to Document**: Navigate to source document
- **Verify**: Check if vector still exists in Pinecone

### 6.5 Conflict Management

Document conflicts occur when the system detects potential issues during processing.

#### Conflict Types

| Type | Korean | Description |
|------|--------|-------------|
| **Duplicate Content** | 중복 콘텐츠 | Same content found in multiple documents |
| **Version Mismatch** | 버전 불일치 | Conflicting versions of same document |
| **Category Mismatch** | 카테고리 불일치 | Document doesn't match category criteria |
| **Metadata Conflict** | 메타데이터 충돌 | Inconsistent metadata detected |
| **Employee Mismatch** | 직원 불일치 | Employee ID not found or mismatched |

#### Resolving Conflicts

1. **Navigate to conflict list** (from Dashboard or Lineage page)
2. **Click on a conflict** to view details
3. **Review the comparison view**:
   - Left: Existing data
   - Right: New data
4. **Choose resolution**:
   - **Keep Existing**: Discard new data
   - **Keep New**: Replace with new data
   - **Merge**: Manually combine (advanced)
   - **Dismiss**: Ignore the conflict

#### Conflict Statistics

- **Total Conflicts**: All detected conflicts
- **By Type**: Distribution by conflict type
- **Resolution Rate**: Percentage resolved
- **Average Resolution Time**: Time to resolve

---

## 7. System Administration

### 7.1 Analytics

**Navigation**: Sidebar → 시스템 → 분석

**Required Permission**: `admin.viewAuditLogs`

#### Analytics Dashboard

The Analytics page provides insights into system usage and performance.

**Statistics Cards**:
- Daily Active Users
- Document Processing Volume
- Processing Success Rate
- Average Processing Time

**Usage Chart**:
Visual representation of system usage over time.

**Audit Log**:
Chronological list of all system activities:

| Event Type | Examples |
|------------|----------|
| **Authentication** | Login, logout, failed attempts |
| **Document Operations** | Upload, process, delete |
| **Employee Operations** | Create, update, delete |
| **Configuration Changes** | Settings updates |
| **System Events** | Errors, warnings |

Each log entry includes:
- Timestamp
- User (if applicable)
- Action performed
- Affected resource
- Result (success/failure)

### 7.2 Settings

**Navigation**: Sidebar → 시스템 → 설정

**Required Permission**: `admin.manageSettings`

#### General Settings

| Setting | Description |
|---------|-------------|
| **Organization Name** | Your organization's display name |
| **Timezone** | System timezone (default: Asia/Seoul) |
| **Dark Mode** | Enable/disable dark theme |

#### Notification Settings

| Setting | Description |
|---------|-------------|
| **Email Notifications** | Receive important event emails |
| **Document Processing Alerts** | Notify when processing completes |
| **Conflict Alerts** | Notify when conflicts detected |

#### API Integrations

Monitor the status of connected services:

| Service | Purpose | Status Indicators |
|---------|---------|-------------------|
| **OpenAI** | Text embeddings | Green = Connected |
| **Pinecone** | Vector storage | Green = Connected |
| **KakaoTalk** | Chatbot integration | Yellow = Needs setup |

#### Database Settings

| Action | Description |
|--------|-------------|
| **View Status** | Check database health |
| **Create Backup** | Manual backup trigger |
| **Check Migrations** | View pending migrations |

### 7.3 Security

**Navigation**: Sidebar → 시스템 → 보안

**Required Permission**: `admin.manageUsers`

#### User Management

View and manage system users:

| Column | Description |
|--------|-------------|
| **Name** | User's display name |
| **Email** | Login email |
| **Role** | Assigned role |
| **Status** | Active/Inactive |
| **Last Login** | Most recent login time |

**Actions**:
- **Add User**: Create new system user
- **Edit**: Modify user details or role
- **Deactivate**: Disable user access

#### Security Status

Monitor security settings:

| Check | Good Status | Action Needed |
|-------|-------------|---------------|
| **SSL/TLS** | "Active" (green) | Ensure HTTPS |
| **2FA** | "Active" (green) | Consider enabling |
| **Password Policy** | "Active" (green) | Review requirements |

#### Access Control

View role permissions summary:

| Role | Access Level |
|------|--------------|
| **Super Admin** | All permissions |
| **Org Admin** | Organization management |
| **Manager** | Team management + documents |
| **Employee** | Personal data only |
| **Viewer** | Read-only access |

#### API Key Management

Manage API keys for external integrations:

- **Production Key**: For production environment
- **Development Key**: For testing
- **Generate New Key**: Create new API key
- **Revoke Key**: Disable existing key

---

## 8. Roles and Permissions

### 8.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                   SUPER_ADMIN                        │
│            (Full system access)                      │
├─────────────────────────────────────────────────────┤
│                    ORG_ADMIN                         │
│          (Organization management)                   │
├─────────────────────────────────────────────────────┤
│                     MANAGER                          │
│         (Team management + documents)                │
├─────────────────────────────────────────────────────┤
│                    EMPLOYEE                          │
│            (Personal access only)                    │
├─────────────────────────────────────────────────────┤
│                     VIEWER                           │
│              (Read-only access)                      │
└─────────────────────────────────────────────────────┘
```

### 8.2 Role Descriptions

| Role | Korean | Description | Typical Users |
|------|--------|-------------|---------------|
| **super_admin** | 최고 관리자 | Complete system control | System administrators |
| **org_admin** | 조직 관리자 | Organization-wide management | HR directors, executives |
| **manager** | 매니저 | Team and document management | Team leads, department heads |
| **employee** | 직원 | Personal data and RAG queries | Regular employees |
| **viewer** | 열람자 | Read-only access | Auditors, observers |

### 8.3 Detailed Permission Matrix

#### Document Permissions

| Permission | super_admin | org_admin | manager | employee | viewer |
|------------|:-----------:|:---------:|:-------:|:--------:|:------:|
| **Create** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Read** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Update** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Delete** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Process** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Rollback** | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Employee Permissions

| Permission | super_admin | org_admin | manager | employee | viewer |
|------------|:-----------:|:---------:|:-------:|:--------:|:------:|
| **Create** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Read** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Update** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Sensitive** | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Category Permissions

| Permission | super_admin | org_admin | manager | employee | viewer |
|------------|:-----------:|:---------:|:-------:|:--------:|:------:|
| **Create** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Read** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Update** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete** | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Template Permissions

| Permission | super_admin | org_admin | manager | employee | viewer |
|------------|:-----------:|:---------:|:-------:|:--------:|:------:|
| **Create** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Read** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Update** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete** | ✅ | ✅ | ❌ | ❌ | ❌ |

#### RAG Permissions

| Permission | super_admin | org_admin | manager | employee | viewer |
|------------|:-----------:|:---------:|:-------:|:--------:|:------:|
| **Query** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Query All Employees** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Lineage** | ✅ | ✅ | ✅ | ❌ | ❌ |

#### Admin Permissions

| Permission | super_admin | org_admin | manager | employee | viewer |
|------------|:-----------:|:---------:|:-------:|:--------:|:------:|
| **Manage Users** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Audit Logs** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Manage Settings** | ✅ | ✅ | ❌ | ❌ | ❌ |

### 8.4 Clearance Levels vs. Roles

**Important**: Clearance levels and roles are separate concepts:

| Concept | Purpose | Applies To |
|---------|---------|------------|
| **Role** | System permissions | What actions you can perform |
| **Clearance** | Document access | What documents you can see |

An employee with `manager` role but `basic` clearance can:
- ✅ Upload and process documents (role permission)
- ❌ Query advanced-tier documents (clearance restriction)

---

## 9. Troubleshooting

### 9.1 Login Issues

#### Problem: Cannot log in

**Symptoms**: Login button spins indefinitely or shows error

**Solutions**:
1. **Verify credentials**: Check email and password are correct
2. **Check Caps Lock**: Ensure it's not accidentally enabled
3. **Clear browser cache**: Delete cookies and cached data
4. **Try incognito mode**: Rule out browser extension issues
5. **Contact administrator**: Your account may be deactivated

#### Problem: Redirected back to login after logging in

**Cause**: Session not being maintained

**Solutions**:
1. Enable cookies in browser settings
2. Disable any privacy extensions temporarily
3. Check if system clock is accurate
4. Try a different browser

### 9.2 Document Upload Issues

#### Problem: Upload fails immediately

**Possible Causes**:
- File too large (>50MB)
- Unsupported format
- Network interruption

**Solutions**:
1. Check file size (must be under 50MB)
2. Verify file extension is supported
3. Try compressing large files
4. Check network connection

#### Problem: Document stuck in "Processing"

**Possible Causes**:
- Background job queue backed up
- Processing error not reported
- Template configuration issue

**Solutions**:
1. Wait 5-10 minutes for queue to clear
2. Refresh the page
3. Check system status in Dashboard
4. Try reprocessing the document

#### Problem: Document shows "Failed" status

**Diagnosis**:
1. Click on the document to view details
2. Check the error message in processing log
3. Review the error type

**Common Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| "Template mismatch" | Wrong template selected | Re-upload with correct template |
| "Employee not found" | Employee ID in document not in system | Add the employee first |
| "Parse error" | Document format issues | Check file integrity, try re-saving |
| "Embedding failed" | OpenAI API issue | Wait and retry |

### 9.3 AI Chat Issues

#### Problem: Chat not responding

**Solutions**:
1. Refresh the page
2. Check network connection
3. Verify there are documents in the system
4. Check API status in Settings

#### Problem: Irrelevant or wrong answers

**Possible Causes**:
- No relevant documents uploaded
- Wrong clearance level
- Poor question phrasing

**Solutions**:
1. Verify relevant documents are uploaded and processed
2. Check your clearance level matches document requirements
3. Rephrase the question more specifically
4. Adjust Top-K setting to retrieve more context

#### Problem: "No context found" response

**Cause**: No documents match the query

**Solutions**:
1. Verify documents are uploaded and processed (status = Completed)
2. Check that your clearance level allows access
3. Ensure the information exists in uploaded documents
4. Try broader search terms

### 9.4 Permission Issues

#### Problem: Menu items missing

**Cause**: Your role doesn't have permission

**Solution**: Contact administrator to:
1. Verify your current role
2. Request role upgrade if needed
3. Request specific permission grant

#### Problem: "Access Denied" error

**Cause**: Attempting action without permission

**Solution**:
1. Verify the action is allowed for your role
2. Request appropriate permissions
3. Contact administrator

### 9.5 Performance Issues

#### Problem: Pages loading slowly

**Solutions**:
1. Clear browser cache
2. Check network speed
3. Try during off-peak hours
4. Report to administrator if persistent

#### Problem: Search/filter not working

**Solutions**:
1. Clear all filters and try again
2. Refresh the page
3. Try different search terms
4. Check for browser console errors

### 9.6 Data Issues

#### Problem: Data not appearing after upload

**Check**:
1. Document processing status (should be "Completed")
2. Category and template assignment
3. Your access permissions

#### Problem: Duplicate data showing

**Cause**: Document processed multiple times

**Solution**:
1. Delete duplicate documents
2. Resolve any detected conflicts
3. Contact administrator to clean up vectors

---

## 10. Appendix

### 10.1 Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Send message | AI Chat input |
| `Escape` | Close modal/panel | Any modal |
| `Ctrl/Cmd + K` | Quick search | Global (if enabled) |

### 10.2 Supported File Formats

| Format | Extension(s) | Processing Method |
|--------|--------------|-------------------|
| **Excel** | .xlsx, .xls | Template-based parsing |
| **CSV** | .csv | Template-based parsing |
| **PDF** | .pdf | Text extraction |
| **Word** | .docx | Text extraction |

### 10.3 System Limits

| Limit | Value |
|-------|-------|
| Maximum file size | 50 MB |
| Maximum files per upload | 10 |
| Maximum page size | 100 records |
| Default page size | 20 records |
| Vector dimensions | 3,072 |
| Maximum context tokens | 8,000 |

### 10.4 Browser Compatibility

| Browser | Minimum Version | Status |
|---------|-----------------|--------|
| Chrome | 90+ | ✅ Recommended |
| Firefox | 88+ | ✅ Supported |
| Safari | 14+ | ✅ Supported |
| Edge | 90+ | ✅ Supported |
| Internet Explorer | - | ❌ Not supported |

### 10.5 Glossary

| Term | Definition |
|------|------------|
| **RAG** | Retrieval-Augmented Generation - AI technique combining document retrieval with language generation |
| **Vector** | Numerical representation of text for semantic similarity comparison |
| **Embedding** | Process of converting text to vectors using AI models |
| **Chunk** | A portion of a document split for processing and vectorization |
| **Namespace** | Isolated storage space in Pinecone for organizing vectors |
| **Clearance Level** | Access tier determining which documents a user can access |
| **Template** | Configuration defining how to parse and process a document type |
| **Lineage** | Tracking information linking vectors back to source documents |
| **Conflict** | Detected inconsistency between documents or data |
| **Token** | Basic unit of text processed by AI models |

### 10.6 API Error Codes

| Error Code | Description |
|------------|-------------|
| `UNAUTHORIZED` | Not logged in or session expired |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Requested resource doesn't exist |
| `VALIDATION_ERROR` | Input data failed validation |
| `ALREADY_EXISTS` | Duplicate resource detected |
| `PROCESSING_FAILED` | Document processing error |
| `EMBEDDING_FAILED` | Vector embedding error |
| `CONFLICT` | Data conflict detected |

### 10.7 Contact & Support

For additional support:
1. **In-app help**: Check tooltips and inline documentation
2. **System administrator**: Contact your organization's admin
3. **Technical issues**: Report bugs through proper channels

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Maintainer**: ContractorHub Development Team
