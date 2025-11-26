# Guardian Flow Sprint Plan
**Date:** November 25, 2025  
**Planning Period:** November 25, 2025 - March 31, 2026  
**Current Completion:** 95%  
**Target Completion:** 100%

---

## Executive Summary

This sprint plan addresses the 11 identified gaps across 8 modules to achieve 100% completion. The plan is organized into 6 sprints over 4 months, prioritizing critical P1 items first, followed by P2-P4 items.

**Sprint Duration:** 2 weeks per sprint  
**Team Size:** 2-3 developers  
**Sprint Goal:** Complete 2-3 gaps per sprint

---

## Sprint Overview

| Sprint | Duration | Focus | Gaps Addressed | Target Completion |
|--------|----------|-------|----------------|-------------------|
| **Sprint 1** | Nov 25 - Dec 8 | P1 Critical Fixes | #1, #3 | 95% → 96.5% |
| **Sprint 2** | Dec 9 - Dec 22 | P1 Payment Gateway | #2 | 96.5% → 97.5% |
| **Sprint 3** | Dec 23 - Jan 5 | P2 Financial & Inventory | #4, #5 | 97.5% → 98.5% |
| **Sprint 4** | Jan 6 - Jan 19 | P2 Warranty & Procurement | #6, #7 | 98.5% → 99.5% |
| **Sprint 5** | Jan 20 - Feb 2 | P3 Scheduler Enhancement | #8, #9 | 99.5% → 99.7% |
| **Sprint 6** | Feb 3 - Feb 16 | P4 Knowledge & RAG | #10, #11 | 99.7% → 100% |

---

## Sprint 1: Critical Fixes (Nov 25 - Dec 8, 2025)
**Sprint Goal:** Fix blocking issues in Photo Validation and Invoice Payment Status

### Gap #1: Photo Validation UI Integration
**Priority:** P1 (High)  
**Estimate:** 2 hours  
**Module:** Photo Validation  
**Assigned To:** Frontend Developer

**Tasks:**
1. Connect PhotoCapture component to validation endpoint (30 min)
2. Display validation results in UI (30 min)
3. Add error feedback for failed validation (30 min)
4. Test end-to-end workflow (30 min)

**Acceptance Criteria:**
- ✅ Photos automatically validated on capture
- ✅ Validation results displayed immediately
- ✅ Failed validations show clear error messages
- ✅ Technician can retry validation

**Definition of Done:**
- Code reviewed and merged
- E2E test passing
- Manual QA completed
- Documentation updated

---

### Gap #3: Invoice Payment Status Updates
**Priority:** P1 (High)  
**Estimate:** 3 days  
**Module:** Finance & Billing  
**Assigned To:** Full-stack Developer

**Tasks:**
1. **Database Schema** (4 hours)
   - Add `payment_status` enum to invoices table
   - Add `payment_history` table
   - Add `payment_received_at` timestamp
   - Create migration script

2. **Backend API** (8 hours)
   - Create `update-payment-status` endpoint
   - Add payment history logging
   - Implement auto-update on payment received
   - Add payment status webhook handler

3. **Frontend UI** (8 hours)
   - Add payment status badge to invoice list
   - Create payment history view
   - Add payment status filter
   - Update invoice detail page

4. **Testing** (4 hours)
   - Unit tests for payment status logic
   - Integration tests for payment flow
   - E2E test for payment status updates

**Acceptance Criteria:**
- ✅ Payment status tracked (pending, paid, partial, failed)
- ✅ Payment history logged with timestamps
- ✅ Auto-update on payment webhook received
- ✅ UI displays current payment status
- ✅ Payment history visible in invoice detail

**Definition of Done:**
- Database migration applied
- API endpoints tested
- Frontend UI complete
- All tests passing
- Documentation updated

---

### Sprint 1 Deliverables
- Photo Validation UI fully integrated
- Invoice Payment Status tracking complete
- **Module Impact:**
  - Photo Validation: 85% → 100% ✅
  - Finance & Billing: 75% → 87.5% ⚠️
- **Overall Completion:** 95% → 96.5%

---

## Sprint 2: Payment Gateway (Dec 9 - Dec 22, 2025)
**Sprint Goal:** Complete customer payment gateway integration

### Gap #2: Customer Payment Gateway
**Priority:** P1 (High)  
**Estimate:** 1 week (5 days)  
**Module:** Finance & Billing, Customer Portal  
**Assigned To:** Full-stack Developer + Integration Specialist

**Tasks:**

**Week 1: Stripe Integration**
1. **Stripe Setup** (4 hours)
   - Create Stripe account/connect existing
   - Configure webhook endpoints
   - Set up test and production keys
   - Add Stripe SDK to backend

2. **Backend Payment API** (16 hours)
   - Create `create-payment-intent` endpoint
   - Implement payment confirmation handler
   - Add payment webhook handler
   - Create receipt generation service
   - Add payment failure handling

3. **Database Schema** (4 hours)
   - Add `payment_intents` table
   - Add `payment_methods` table
   - Add `receipts` table
   - Link to invoices table

**Week 2: Frontend Integration**
4. **Payment UI Components** (16 hours)
   - Create payment form component
   - Add Stripe Elements integration
   - Build payment confirmation page
   - Add receipt download/view
   - Create payment history view

5. **Customer Portal Integration** (8 hours)
   - Add "Pay Now" button to invoices
   - Integrate payment form
   - Show payment status
   - Add payment history tab

6. **Testing & Documentation** (8 hours)
   - Test payment flow end-to-end
   - Test webhook handling
   - Test receipt generation
   - Update API documentation
   - Create user guide

**Acceptance Criteria:**
- ✅ Customers can pay invoices via Stripe
- ✅ Payment confirmation sent via email
- ✅ Receipt generated and downloadable
- ✅ Payment status updated automatically
- ✅ Failed payments handled gracefully
- ✅ Payment history tracked

**Definition of Done:**
- Stripe integration complete
- Payment flow tested (test mode)
- Receipt generation working
- Customer Portal updated
- Documentation complete
- Security review passed

---

### Sprint 2 Deliverables
- Complete payment gateway with Stripe
- Receipt generation system
- Customer Portal payment integration
- **Module Impact:**
  - Finance & Billing: 87.5% → 100% ✅
  - Customer Portal: 63% → 88% ⚠️
- **Overall Completion:** 96.5% → 97.5%

---

## Sprint 3: Financial & Inventory Automation (Dec 23, 2025 - Jan 5, 2026)
**Sprint Goal:** Automate penalty application and enable stock adjustments

### Gap #4: Penalty Auto-Application Logic
**Priority:** P2 (Medium)  
**Estimate:** 1 week (5 days)  
**Module:** Finance & Billing  
**Assigned To:** Backend Developer

**Tasks:**
1. **SLA Breach Detection** (8 hours)
   - Create cron job to check SLA breaches
   - Implement breach detection logic
   - Add breach notification system
   - Create breach audit log

2. **Auto-Penalty Calculation** (12 hours)
   - Trigger penalty calculation on breach
   - Apply penalty rules automatically
   - Create penalty invoice
   - Link penalty to work order

3. **Dispute Workflow** (8 hours)
   - Create dispute initiation endpoint
   - Add dispute status tracking
   - Build dispute approval workflow
   - Add dispute resolution logic

4. **Testing & Integration** (4 hours)
   - Test auto-penalty on SLA breach
   - Test dispute workflow
   - Integration tests
   - E2E tests

**Acceptance Criteria:**
- ✅ Penalties calculated automatically on SLA breach
- ✅ Penalty invoices created automatically
- ✅ Dispute can be initiated from penalty
- ✅ Dispute workflow functional
- ✅ Audit trail for all penalty actions

**Definition of Done:**
- Auto-penalty logic complete
- Dispute workflow functional
- All tests passing
- Documentation updated

---

### Gap #5: Inventory Stock Adjustments
**Priority:** P2 (Medium)  
**Estimate:** 4 days  
**Module:** Inventory Management  
**Assigned To:** Full-stack Developer

**Tasks:**
1. **Database Schema** (2 hours)
   - Add `stock_adjustments` table
   - Add adjustment reason enum
   - Link to stock_levels table
   - Add audit fields

2. **Backend API** (12 hours)
   - Create `adjust-stock` endpoint
   - Implement increase/decrease logic
   - Add adjustment reason tracking
   - Create adjustment history endpoint
   - Add validation (prevent negative stock)

3. **Frontend UI** (10 hours)
   - Create stock adjustment dialog
   - Add adjustment reason selector
   - Build adjustment history view
   - Add adjustment audit trail
   - Update inventory list with adjustment actions

4. **Testing** (4 hours)
   - Unit tests for adjustment logic
   - Integration tests
   - E2E tests
   - Edge case testing (negative stock prevention)

**Acceptance Criteria:**
- ✅ Stock can be increased/decreased
- ✅ Adjustment reason required
- ✅ Audit trail for all adjustments
- ✅ Adjustment history visible
- ✅ Negative stock prevented
- ✅ Adjustments linked to user

**Definition of Done:**
- Stock adjustment API complete
- UI components functional
- All tests passing
- Documentation updated

---

### Sprint 3 Deliverables
- Auto-penalty application system
- Stock adjustment functionality
- **Module Impact:**
  - Finance & Billing: 100% → 100% (maintained)
  - Inventory Management: 83% → 100% ✅
- **Overall Completion:** 97.5% → 98.5%

---

## Sprint 4: Warranty & Procurement (Jan 6 - Jan 19, 2026)
**Sprint Goal:** Complete warranty management and procurement workflows

### Gap #6: Warranty Record CRUD
**Priority:** P2 (Medium)  
**Estimate:** 4 days  
**Module:** Warranty Management  
**Assigned To:** Full-stack Developer

**Tasks:**
1. **Backend API** (12 hours)
   - Create warranty record endpoint
   - Update warranty record endpoint
   - Delete warranty record endpoint
   - Bulk warranty upload endpoint
   - Warranty validation logic

2. **Frontend UI** (10 hours)
   - Create warranty record form
   - Build warranty list view
   - Add warranty edit functionality
   - Create bulk upload interface
   - Add warranty search/filter

3. **Bulk Upload** (6 hours)
   - CSV import functionality
   - Data validation
   - Error handling and reporting
   - Import history tracking

**Acceptance Criteria:**
- ✅ Create warranty records via UI
- ✅ Update warranty terms
- ✅ Delete warranty records (with validation)
- ✅ Bulk upload via CSV
- ✅ Warranty validation on create/update

**Definition of Done:**
- CRUD operations complete
- Bulk upload functional
- All tests passing
- Documentation updated

---

### Gap #7: Procurement PO Creation
**Priority:** P2 (Medium)  
**Estimate:** 1 week (5 days)  
**Module:** Procurement  
**Assigned To:** Full-stack Developer

**Tasks:**
1. **Vendor Management** (8 hours)
   - Create vendor selection UI
   - Add vendor search/filter
   - Vendor rating/performance display
   - Vendor contact information

2. **PO Creation Workflow** (16 hours)
   - Create PO form with line items
   - Add item selection from inventory
   - Calculate totals automatically
   - Add PO terms and conditions
   - Generate PO number

3. **Approval Process** (8 hours)
   - Create approval workflow
   - Add approval routing logic
   - Build approval UI
   - Add approval notifications
   - Track approval history

4. **PO Management** (8 hours)
   - PO list view with filters
   - PO detail view
   - PO status tracking
   - PO history/audit trail

**Acceptance Criteria:**
- ✅ Full PO creation workflow
- ✅ Vendor selection functional
- ✅ Approval process working
- ✅ PO tracking and history
- ✅ PO status management

**Definition of Done:**
- PO workflow complete
- Approval process functional
- All tests passing
- Documentation updated

---

### Sprint 4 Deliverables
- Warranty management CRUD complete
- Procurement PO workflow complete
- **Module Impact:**
  - Warranty Management: 67% → 100% ✅
  - Procurement: 70% → 100% ✅
- **Overall Completion:** 98.5% → 99.5%

---

## Sprint 5: Scheduler Enhancement (Jan 20 - Feb 2, 2026)
**Sprint Goal:** Enhance scheduler with calendar view and advanced features

### Gap #8: Scheduler Module Enhancement
**Priority:** P3 (Low)  
**Estimate:** 2 weeks (10 days)  
**Module:** Dispatch & Scheduling  
**Assigned To:** Frontend Developer + Backend Developer

**Tasks:**

**Week 1: Calendar View**
1. **Calendar Component** (16 hours)
   - Integrate calendar library (react-big-calendar)
   - Create calendar view layout
   - Add month/week/day views
   - Implement date navigation
   - Add event rendering

2. **Event Management** (12 hours)
   - Fetch work orders for date range
   - Map work orders to calendar events
   - Add event colors by status
   - Implement event tooltips
   - Add event click handlers

**Week 2: Drag & Drop & Conflicts**
3. **Drag & Drop** (16 hours)
   - Implement drag-and-drop for events
   - Add drop validation
   - Update work order assignment on drop
   - Add visual feedback
   - Handle drag conflicts

4. **Conflict Detection** (12 hours)
   - Detect scheduling conflicts
   - Check technician availability
   - Validate time slots
   - Show conflict warnings
   - Prevent invalid assignments

5. **Testing & Polish** (8 hours)
   - Test calendar interactions
   - Test drag-and-drop
   - Test conflict detection
   - Performance optimization
   - UI/UX improvements

**Acceptance Criteria:**
- ✅ Calendar view with month/week/day options
- ✅ Work orders displayed as events
- ✅ Drag-and-drop to reschedule
- ✅ Conflict detection and warnings
- ✅ Real-time updates

**Definition of Done:**
- Calendar view functional
- Drag-and-drop working
- Conflict detection complete
- All tests passing
- Performance optimized

---

### Gap #9: MFA Override UI Integration
**Priority:** P3 (Low)  
**Estimate:** 3 days  
**Module:** Compliance & Security  
**Assigned To:** Frontend Developer

**Tasks:**
1. **Override Request Form** (8 hours)
   - Create override request dialog
   - Add reason field
   - Add duration selector
   - Add approval workflow UI

2. **Approval Workflow UI** (8 hours)
   - Create approval queue view
   - Add approve/reject actions
   - Show override request details
   - Add approval history

3. **Testing** (4 hours)
   - Test override request flow
   - Test approval workflow
   - E2E tests

**Acceptance Criteria:**
- ✅ Override request form accessible
- ✅ Approval workflow functional
- ✅ Override status visible
- ✅ Audit trail maintained

**Definition of Done:**
- UI components complete
- Approval workflow functional
- All tests passing

---

### Sprint 5 Deliverables
- Enhanced scheduler with calendar view
- MFA override UI complete
- **Module Impact:**
  - Dispatch & Scheduling: 88% → 100% ✅
  - Compliance & Security: 100% → 100% (maintained)
- **Overall Completion:** 99.5% → 99.7%

---

## Sprint 6: Knowledge & AI (Feb 3 - Feb 16, 2026)
**Sprint Goal:** Complete Knowledge Base and RAG Engine

### Gap #10: Knowledge Base
**Priority:** P4 (Future)  
**Estimate:** 2 weeks (10 days)  
**Module:** Customer Portal, Training & Knowledge  
**Assigned To:** Full-stack Developer + Content Specialist

**Tasks:**

**Week 1: Core Knowledge Base**
1. **Database Schema** (4 hours)
   - Create `knowledge_articles` table
   - Create `knowledge_categories` table
   - Create `article_tags` table
   - Add search indexes

2. **Backend API** (16 hours)
   - Create article CRUD endpoints
   - Implement search functionality
   - Add category management
   - Create article versioning
   - Add article analytics

3. **Content Management** (12 hours)
   - Create article editor
   - Add rich text support
   - Implement article publishing workflow
   - Add article templates

**Week 2: AI Search & Integration**
4. **AI-Powered Search** (16 hours)
   - Integrate semantic search
   - Implement relevance ranking
   - Add search suggestions
   - Create search analytics

5. **Customer Portal Integration** (8 hours)
   - Add Knowledge Base tab
   - Integrate search
   - Add article view
   - Create FAQ section

6. **Testing & Content** (8 hours)
   - Test search functionality
   - Create initial content
   - E2E tests
   - Documentation

**Acceptance Criteria:**
- ✅ Knowledge base articles manageable
- ✅ AI-powered search functional
- ✅ Articles accessible from Customer Portal
- ✅ FAQ section available
- ✅ Search analytics tracked

**Definition of Done:**
- Knowledge base functional
- AI search working
- Initial content added
- All tests passing
- Documentation complete

---

### Gap #11: RAG Engine
**Priority:** P4 (Future)  
**Estimate:** 3 weeks (15 days) - Split across Sprint 6 & 7  
**Module:** Training & Knowledge  
**Assigned To:** ML Engineer + Backend Developer

**Tasks (Sprint 6 - Part 1):**

1. **Vector Database Setup** (8 hours)
   - Set up vector database (Pinecone/Weaviate)
   - Configure embeddings model
   - Create vector index
   - Test vector storage

2. **Document Processing** (16 hours)
   - Create document ingestion pipeline
   - Implement text chunking
   - Generate embeddings
   - Store in vector database
   - Add document metadata

3. **Retrieval System** (12 hours)
   - Implement semantic search
   - Create retrieval API
   - Add relevance scoring
   - Implement reranking

**Tasks (Sprint 7 - Part 2):**
4. **Generation Integration** (16 hours)
   - Integrate with LLM (GPT/Gemini)
   - Create prompt templates
   - Implement context injection
   - Add response generation

5. **API & UI** (12 hours)
   - Create RAG API endpoint
   - Build RAG query interface
   - Add response display
   - Create conversation history

6. **Testing & Optimization** (8 hours)
   - Test retrieval accuracy
   - Optimize chunk size
   - Test generation quality
   - Performance tuning

**Acceptance Criteria:**
- ✅ Documents ingested and vectorized
- ✅ Semantic search functional
- ✅ RAG responses generated
- ✅ Context-aware answers
- ✅ Conversation history maintained

**Definition of Done:**
- RAG engine functional
- API endpoints complete
- UI interface working
- Performance optimized
- Documentation complete

---

### Sprint 6 Deliverables
- Knowledge Base complete
- RAG Engine (Part 1 - Retrieval)
- **Module Impact:**
  - Customer Portal: 88% → 100% ✅
  - Training & Knowledge: 33% → 67% ⚠️
- **Overall Completion:** 99.7% → 99.85%

---

## Sprint 7: RAG Completion (Feb 17 - Mar 2, 2026)
**Sprint Goal:** Complete RAG Engine implementation

### Gap #11: RAG Engine (Part 2)
**Priority:** P4 (Future)  
**Estimate:** 1.5 weeks (remaining work)  
**Module:** Training & Knowledge

**Tasks:**
- Complete generation integration
- Build API & UI
- Testing & optimization
- (See Sprint 6 for detailed tasks)

**Sprint 7 Deliverables**
- RAG Engine complete
- **Module Impact:**
  - Training & Knowledge: 67% → 100% ✅
- **Overall Completion:** 99.85% → 100% ✅

---

## Sprint Planning Details

### Team Structure
- **Sprint 1-2:** 2 developers (1 frontend, 1 full-stack)
- **Sprint 3-4:** 2 developers (1 frontend, 1 backend)
- **Sprint 5:** 2 developers (1 frontend, 1 backend)
- **Sprint 6-7:** 3 developers (1 frontend, 1 backend, 1 ML engineer)

### Sprint Ceremonies
- **Sprint Planning:** Monday, 2 hours
- **Daily Standup:** Daily, 15 minutes
- **Sprint Review:** Friday Week 2, 1 hour
- **Sprint Retrospective:** Friday Week 2, 30 minutes

### Definition of Done
- ✅ Code reviewed and approved
- ✅ All unit tests passing
- ✅ Integration tests passing
- ✅ E2E tests passing (where applicable)
- ✅ Manual QA completed
- ✅ Documentation updated
- ✅ No critical bugs
- ✅ Deployed to staging

### Risk Management

**High Risk Items:**
1. **Stripe Integration (Sprint 2)**
   - Risk: Payment gateway complexity
   - Mitigation: Use Stripe test mode, follow official docs
   - Contingency: Extend sprint by 2 days if needed

2. **RAG Engine (Sprint 6-7)**
   - Risk: ML complexity, performance issues
   - Mitigation: Start with simple implementation, iterate
   - Contingency: Split into additional sprint if needed

**Medium Risk Items:**
1. **Scheduler Enhancement (Sprint 5)**
   - Risk: Calendar library integration complexity
   - Mitigation: Use proven library (react-big-calendar)
   - Contingency: Simplify to basic calendar if needed

---

## Timeline Summary

```
Nov 25 - Dec 8:    Sprint 1 (P1 Critical)      → 95% → 96.5%
Dec 9 - Dec 22:    Sprint 2 (P1 Payment)       → 96.5% → 97.5%
Dec 23 - Jan 5:    Sprint 3 (P2 Financial)     → 97.5% → 98.5%
Jan 6 - Jan 19:    Sprint 4 (P2 Warranty/PO)   → 98.5% → 99.5%
Jan 20 - Feb 2:    Sprint 5 (P3 Scheduler)     → 99.5% → 99.7%
Feb 3 - Feb 16:    Sprint 6 (P4 Knowledge)     → 99.7% → 99.85%
Feb 17 - Mar 2:    Sprint 7 (P4 RAG)           → 99.85% → 100%
```

**Total Duration:** 14 weeks (3.5 months)  
**Target Completion Date:** March 2, 2026

---

## Success Metrics

### Sprint-Level Metrics
- **Velocity:** Track story points completed per sprint
- **Burndown:** Monitor sprint burndown chart
- **Quality:** Track bug count and test coverage
- **Blockers:** Time to resolve blockers

### Overall Metrics
- **Completion Rate:** Track overall completion percentage
- **Module Health:** Monitor module completion percentages
- **Technical Debt:** Track technical debt items
- **User Satisfaction:** Collect feedback on new features

---

## Dependencies & Prerequisites

### External Dependencies
- **Stripe Account:** Required for Sprint 2
- **Vector Database Service:** Required for Sprint 6-7 (Pinecone/Weaviate)
- **LLM API Access:** Required for Sprint 6-7 (OpenAI/Gemini)

### Internal Dependencies
- **Database Access:** All sprints
- **API Gateway:** Sprint 2 (payment webhooks)
- **Authentication System:** All sprints

---

## Communication Plan

### Stakeholder Updates
- **Weekly Status Report:** Every Friday
- **Sprint Review:** End of each sprint
- **Demo:** Feature demos at sprint review
- **Escalation:** Immediate for P1 blockers

### Documentation Updates
- **API Documentation:** Updated per sprint
- **User Guides:** Updated for new features
- **Technical Docs:** Updated for architecture changes
- **Release Notes:** Per sprint

---

## Conclusion

This sprint plan provides a clear path from 95% to 100% completion over 7 sprints (14 weeks). The plan prioritizes critical P1 items first, ensuring production readiness, followed by P2-P4 items to achieve full feature completeness.

**Key Milestones:**
- **Week 2:** 97.5% (All P1 items complete)
- **Week 6:** 99.5% (All P2 items complete)
- **Week 10:** 99.7% (All P3 items complete)
- **Week 14:** 100% (All items complete)

**Recommendation:** Execute Sprint 1-2 immediately to address critical gaps. Reassess after Sprint 2 to adjust timeline if needed.

---

**Plan Created:** November 25, 2025  
**Next Review:** December 8, 2025 (End of Sprint 1)

