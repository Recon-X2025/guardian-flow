# Generic Client Naming Guideline

**Created:** November 1, 2025  
**Purpose:** Legal compliance and neutrality in documentation and test data

---

## Policy

**NEVER use real company names** in:
- Documentation
- Test account names/emails
- Example use cases
- Architecture diagrams
- Marketing materials

**ALWAYS use generic industry-based placeholders.**

---

## Generic Naming Convention

### Format: `[Industry] Client [Number]`

| Industry | Naming Pattern | Examples |
|----------|---------------|----------|
| Technology OEM | `OEM Client [N]` | OEM Client 1, OEM Client 2 |
| Insurance | `Insurance Client [N]` | Insurance Client 1 |
| Telecom | `Telecom Client [N]` | Telecom Client 1 |
| Retail/E-commerce | `Retail Client [N]` | Retail Client 1 |
| Healthcare | `Healthcare Client [N]` | Healthcare Client 1 |
| Banking | `Banking Client [N]` | Banking Client 1 |
| Manufacturing | `Manufacturing Client [N]` | Manufacturing Client 1 |

---

## Email Domain

**Standard domain for all test accounts:** `@client.com`

**Rationale:** 
- Clearly identifies as test/example data
- Avoids any real company domain conflicts
- Easy to filter in cleanup scripts

**Examples:**
- ❌ `hp.admin@hp.com`
- ✅ `oem1.admin@client.com`

---

## File Naming Convention

When creating files/documents that would reference clients:

**DON'T:**
- ❌ `hp_inc_implementation.md`
- ❌ `apple_asset_management.md`

**DO:**
- ✅ `oem_client_use_cases.md`
- ✅ `consumer_electronics_asset_management.md`

---

## Architecture Diagrams

**In ASCII/text diagrams:**

**DON'T:**
```
│ • HP Inc        │
│ • Apple         │
│ • ACKO          │
```

**DO:**
```
│ • OEM Client 1  │
│ • OEM Client 2  │
│ • Insurance 1   │
```

---

## Database & Code

### Tenant Slugs
- Format: `[industry]-client-[n]`
- Examples: `oem-client-1`, `insurance-client-1`

### Test Accounts
- Email: `[short-name].[role]@client.com`
- Short names: `oem1`, `insurance1`, `telecom1`, etc.

**Examples:**
```
oem1.admin@client.com
oem1.ops@client.com
oem1.finance@client.com
insurance1.admin@client.com
telecom1.ops@client.com
```

---

## Why This Matters

### Legal Protection
- Prevents potential trademark infringement claims
- Avoids implying endorsement or partnership
- Reduces liability from naming conflicts

### Professionalism
- Demonstrates understanding of legal boundaries
- Shows respect for real companies
- Maintains neutrality in platform marketing

### Flexibility
- Generic names work across multiple industries
- Don't imply specific feature limitations
- Allow for broader market positioning

---

## Enforcement

### Code Reviews
Always check for:
1. ✅ Generic client names
2. ✅ `@client.com` domain for test accounts
3. ✅ Industry-based naming conventions
4. ❌ No real company names

### Documentation Reviews
Always verify:
1. ✅ Diagrams use placeholder names
2. ✅ Examples are industry-generic
3. ✅ No real company references
4. ❌ No implied endorsements

---

## Examples Repository

When building examples:
- Use real **industry characteristics** (e.g., "Insurance companies need fraud detection")
- Use real **regulatory requirements** (e.g., "Healthcare must comply with NABH")
- Use generic **company names** (e.g., "Healthcare Client 1")

**Good Example:**
```
Healthcare Client 1 requires:
- Medical equipment maintenance tracking
- NABH regulatory compliance
- HIPAA data security
```

**Bad Example:**
```
Apollo Hospital requires:
- Medical equipment maintenance tracking
- NABH regulatory compliance
```

---

## Questions to Ask

Before referencing any company, ask:
1. ❓ Is this a real company name?
2. ❓ Could this be misunderstood as a partnership?
3. ❓ Would we want this in legal discovery?
4. ❓ Does this limit our market positioning?

If ANY answer is "yes" or "maybe" → Use generic name instead.

---

**Last Updated:** November 1, 2025  
**Status:** Active Policy

