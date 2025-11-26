# Missing Features Implementation Plan

**Date:** November 25, 2025  
**Priority:** Complete Missing Features First  
**Status:** Planning Phase

---

## 🎯 Missing Features Overview

### Priority 1: High Impact (Complete First)
1. **Payment Gateway** (Customer Portal - 40% remaining)
2. **Photo Validation UI** (Unified Platform - 15% remaining)

### Priority 2: Medium Impact
3. **Knowledge Base** (Customer Portal & Training - 0%)
4. **FAQ System** (Customer Portal - 0%)

### Priority 3: Advanced Features
5. **RAG Engine** (Training & Knowledge - 0%)
6. **AI Assistant/Copilot** (Training & Knowledge - 0%)

---

## 📋 Feature 1: Payment Gateway (40% → 100%)

### Current Status
- ✅ UI exists (`src/pages/Payments.tsx`)
- ✅ Backend route exists (`server/routes/payments.js`)
- ⚠️ Uses Supabase (needs migration)
- ❌ No actual payment processing integration
- ❌ No Stripe/Razorpay integration

### Implementation Tasks

#### 1.1 Migrate Payments Page to apiClient
- [ ] Replace `supabase` with `apiClient` in `Payments.tsx`
- [ ] Update invoice fetching logic
- [ ] Test invoice display

#### 1.2 Implement Payment Processing Backend
- [ ] Create payment processing endpoint
- [ ] Add Stripe integration (or Razorpay for India)
- [ ] Implement payment webhook handler
- [ ] Update invoice status after payment

#### 1.3 Add Payment Gateway UI
- [ ] Create payment form component
- [ ] Add payment method selection
- [ ] Implement payment confirmation flow
- [ ] Add payment history view

**Estimated Time:** 1 week  
**Files to Modify:**
- `src/pages/Payments.tsx`
- `server/routes/payments.js`
- `server/routes/functions.js` (add payment processing)

---

## 📋 Feature 2: Photo Validation UI (15% → 100%)

### Current Status
- ✅ Backend validation complete (100%)
- ✅ Photo capture page exists
- ⚠️ UI integration incomplete (70%)

### Implementation Tasks

#### 2.1 Complete UI Integration
- [ ] Connect photo validation to backend
- [ ] Display validation results in UI
- [ ] Add validation status indicators
- [ ] Implement validation workflow

**Estimated Time:** 2-3 hours  
**Files to Modify:**
- `src/pages/PhotoCapturePage.tsx`
- `src/components/PrecheckStatus.tsx` (if needed)

---

## 📋 Feature 3: Knowledge Base (0% → 100%)

### Current Status
- ✅ UI placeholder exists (`src/pages/KnowledgeBase.tsx`)
- ❌ No backend implementation
- ❌ No database tables
- ❌ No document storage

### Implementation Tasks

#### 3.1 Database Schema
- [ ] Create `knowledge_base_articles` table
- [ ] Create `knowledge_base_categories` table
- [ ] Create `knowledge_base_tags` table
- [ ] Create `knowledge_base_attachments` table

#### 3.2 Backend API
- [ ] Create CRUD endpoints for articles
- [ ] Implement search functionality
- [ ] Add document upload endpoint
- [ ] Implement category/tag management

#### 3.3 Frontend Implementation
- [ ] Migrate KnowledgeBase.tsx to use apiClient
- [ ] Implement article creation/editing
- [ ] Add document upload functionality
- [ ] Implement search with filters
- [ ] Add article viewing page

**Estimated Time:** 1-2 weeks  
**Files to Create/Modify:**
- `server/routes/knowledge-base.js` (new)
- `src/pages/KnowledgeBase.tsx`
- `src/components/KnowledgeBaseArticle.tsx` (new)
- `src/components/KnowledgeBaseEditor.tsx` (new)

---

## 📋 Feature 4: FAQ System (0% → 100%)

### Current Status
- ❌ No implementation exists
- ❌ No UI
- ❌ No backend

### Implementation Tasks

#### 4.1 Database Schema
- [ ] Create `faqs` table
- [ ] Create `faq_categories` table
- [ ] Add tenant isolation

#### 4.2 Backend API
- [ ] Create CRUD endpoints for FAQs
- [ ] Implement category management
- [ ] Add search functionality
- [ ] Implement FAQ ordering/priority

#### 4.3 Frontend Implementation
- [ ] Create FAQ page component
- [ ] Add FAQ management UI (admin)
- [ ] Implement FAQ display (customer portal)
- [ ] Add search and filtering
- [ ] Add FAQ categories

**Estimated Time:** 1 week  
**Files to Create:**
- `server/routes/faqs.js` (new)
- `src/pages/FAQs.tsx` (new)
- `src/components/FAQList.tsx` (new)
- `src/components/FAQEditor.tsx` (new)

---

## 📋 Feature 5: RAG Engine (0% → 100%)

### Current Status
- ✅ UI placeholder exists (`src/pages/RAGEngine.tsx`)
- ❌ No backend implementation
- ❌ No vector database
- ❌ No embedding generation

### Implementation Tasks

#### 5.1 Database Schema
- [ ] Create `rag_documents` table
- [ ] Create `rag_chunks` table
- [ ] Create `rag_embeddings` table (or use vector DB)
- [ ] Create `rag_queries` table (for logging)

#### 5.2 Backend Implementation
- [ ] Integrate embedding model (OpenAI/Cohere)
- [ ] Implement document chunking
- [ ] Implement vector search
- [ ] Create RAG query endpoint
- [ ] Add document ingestion pipeline

#### 5.3 Frontend Implementation
- [ ] Migrate RAGEngine.tsx to use apiClient
- [ ] Connect to backend RAG endpoint
- [ ] Display search results with relevance
- [ ] Add document upload for RAG
- [ ] Show citation sources

**Estimated Time:** 2-3 weeks  
**Files to Create/Modify:**
- `server/routes/rag.js` (new)
- `server/services/embeddingService.js` (new)
- `server/services/vectorSearch.js` (new)
- `src/pages/RAGEngine.tsx`

---

## 📋 Feature 6: AI Assistant/Copilot (0% → 100%)

### Current Status
- ✅ UI placeholder exists (`src/pages/Assistant.tsx`)
- ❌ No backend implementation
- ❌ Not connected to RAG engine
- ❌ No LLM integration

### Implementation Tasks

#### 6.1 Backend Implementation
- [ ] Create chat endpoint
- [ ] Integrate with RAG engine
- [ ] Add LLM integration (OpenAI/Anthropic)
- [ ] Implement conversation context
- [ ] Add chat history storage

#### 6.2 Frontend Implementation
- [ ] Migrate Assistant.tsx to use apiClient
- [ ] Connect to chat endpoint
- [ ] Implement real-time chat UI
- [ ] Add message history
- [ ] Display citations from RAG
- [ ] Add suggested questions

**Estimated Time:** 1-2 weeks  
**Files to Create/Modify:**
- `server/routes/assistant.js` (new)
- `server/services/llmService.js` (new)
- `src/pages/Assistant.tsx`

---

## 🚀 Implementation Order

### Week 1: Quick Wins
1. **Photo Validation UI** (2-3 hours) → 15% → 100%
2. **Payment Gateway Migration** (1 day) → Migrate to apiClient
3. **Payment Gateway Integration** (3-4 days) → Add Stripe/Razorpay

**Result:** Unified Platform 95% → 100%, Customer Portal 58% → 75%

### Week 2-3: Knowledge Base & FAQ
4. **Knowledge Base** (1-2 weeks) → Full implementation
5. **FAQ System** (1 week) → Full implementation

**Result:** Customer Portal 75% → 100%, Training & Knowledge 25% → 50%

### Week 4-6: Advanced AI Features
6. **RAG Engine** (2-3 weeks) → Full implementation
7. **AI Assistant** (1-2 weeks) → Connect to RAG

**Result:** Training & Knowledge 50% → 100%

---

## 📊 Expected Completion Timeline

| Week | Features | Customer Portal | Training | Overall Platform |
|------|----------|----------------|----------|-----------------|
| **Current** | - | 58% | 25% | 95% |
| **Week 1** | Photo Validation, Payment Gateway | 75% | 25% | 96% |
| **Week 2-3** | Knowledge Base, FAQ | 100% | 50% | 97% |
| **Week 4-6** | RAG Engine, AI Assistant | 100% | 100% | 100% |

---

## 🎯 Success Criteria

### Payment Gateway
- [ ] Users can process payments via Stripe/Razorpay
- [ ] Invoice status updates after payment
- [ ] Payment history is tracked
- [ ] Webhook handling works correctly

### Photo Validation UI
- [ ] Validation results display in UI
- [ ] Validation workflow is complete
- [ ] Status indicators work correctly

### Knowledge Base
- [ ] Articles can be created/edited/deleted
- [ ] Search functionality works
- [ ] Documents can be uploaded
- [ ] Categories and tags work

### FAQ System
- [ ] FAQs can be managed (CRUD)
- [ ] FAQs display in customer portal
- [ ] Search and filtering work
- [ ] Categories work

### RAG Engine
- [ ] Documents can be ingested
- [ ] Vector search returns relevant results
- [ ] Embeddings are generated correctly
- [ ] Citations are accurate

### AI Assistant
- [ ] Chat interface works
- [ ] Responses use RAG context
- [ ] Citations are displayed
- [ ] Conversation history is saved

---

## 📝 Notes

- **Payment Gateway:** Start with Stripe (easier), add Razorpay later for India market
- **Knowledge Base:** Can reuse document storage from existing system
- **RAG Engine:** Consider using PostgreSQL with pgvector extension or external vector DB
- **AI Assistant:** Use OpenAI GPT-4 or Anthropic Claude for LLM

---

**Last Updated:** November 25, 2025  
**Next Steps:** Begin with Photo Validation UI (quickest win)

