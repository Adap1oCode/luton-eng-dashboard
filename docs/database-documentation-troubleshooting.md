# Database Documentation Troubleshooting Guide

## 🚨 **FIRST STEP: Check Database Documentation System**

**When you encounter ANY data-related error, check this system FIRST before debugging code.**

## Quick Health Check

### 1. **Admin Dashboard** (Recommended)
```
http://localhost:3002/admin/table-docs-monitor
```
- ✅ Real-time system status
- 🔍 Automatic issue detection  
- 🔄 One-click refresh
- 📊 Performance metrics

### 2. **API Health Check**
```bash
# Quick status check
curl http://localhost:3002/api/admin/table-docs-health

# Expected response: {"status": "healthy", "issues": 0}
```

### 3. **Manual Refresh** (If issues detected)
```bash
# Refresh documentation data
curl -X POST http://localhost:3002/api/admin/refresh-table-docs
```

## Common Data Issues & Solutions

### ❌ **"Table not found" or "Column doesn't exist"**
**Check**: Missing tables in documentation
```bash
GET /api/admin/table-docs-health
# Look for "Tables missing from documentation"
```
**Solution**: Refresh documentation after schema changes
```bash
POST /api/admin/refresh-table-docs
```

### ❌ **"Permission denied" or "Access denied"**
**Check**: Database connectivity and permissions
```bash
GET /api/admin/table-docs-health
# Look for "Materialized view missing or inaccessible"
```
**Solution**: Verify database connection and run materialized view SQL

### ❌ **Slow API responses or timeouts**
**Check**: Documentation system performance
```bash
GET /api/admin/table-docs-health
# Look for "Stale documentation data" or "Large tables detected"
```
**Solution**: Refresh materialized view or optimize large tables

### ❌ **Empty results from /api/db-docs**
**Check**: Materialized view data
```bash
GET /api/admin/table-docs-health
# Look for "Materialized view is empty"
```
**Solution**: Run initial population
```bash
POST /api/admin/refresh-table-docs
```

### ❌ **Inconsistent data between tables**
**Check**: Documentation freshness
```bash
GET /api/admin/table-docs-health
# Look for "Stale documentation data"
```
**Solution**: Refresh after schema changes

## Database Documentation API

### **List All Tables**
```bash
GET /api/db-docs?page=1&pageSize=50
```

### **Search Tables**
```bash
GET /api/db-docs?q=tally
```

### **Get Specific Table**
```bash
GET /api/db-docs/tcm_user_tally_card_entries
```

### **Filter by Schema**
```bash
GET /api/db-docs?filters[table_schema]=public
```

## What's Included in Documentation

Each table documentation includes:
- 📋 **Columns**: Data types, nullability, defaults, positions
- 🔍 **Indexes**: Index definitions, uniqueness, primary keys  
- 🔗 **Constraints**: Primary keys, unique constraints, checks
- 🌐 **Foreign Keys**: Referenced tables and definitions
- 🔐 **Grants**: Permission details for different roles
- 🛡️ **RLS**: Row-level security policies and state
- ⚡ **Triggers**: Trigger definitions, timing, events
- 📊 **Dependencies**: Objects that depend on this table
- 📈 **Usage**: Table usage statistics (scans, tuples, etc.)
- 💾 **Size**: Table size information

## Maintenance Schedule

### **Daily** (Automated)
- Health check via monitoring dashboard
- Verify refresh schedule is working

### **After Schema Changes** (Manual)
- Refresh documentation: `POST /api/admin/refresh-table-docs`
- Verify new tables appear in documentation
- Check for any missing tables

### **Weekly** (Manual)
- Review performance metrics
- Check for large tables that might need optimization
- Verify all tables have complete documentation

## Emergency Procedures

### **System Completely Down**
1. Check database connectivity
2. Verify materialized view exists: `SELECT * FROM mv_table_report_combined LIMIT 1;`
3. If missing, run the materialized view creation SQL
4. Refresh data: `SELECT refresh_table_docs();`

### **Missing New Tables**
1. Check if tables exist in database: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
2. Refresh documentation: `POST /api/admin/refresh-table-docs`
3. Verify tables appear in API: `GET /api/db-docs`

### **Performance Issues**
1. Check view size: `GET /api/admin/table-docs-health`
2. Look for large tables in response
3. Consider pagination or lazy loading for large tables
4. Refresh if data is stale

## SQL Commands for Direct Database Access

### **Check Materialized View Status**
```sql
SELECT COUNT(*) as table_count FROM mv_table_report_combined;
SELECT pg_size_pretty(pg_total_relation_size('mv_table_report_combined')) as view_size;
```

### **Manual Refresh**
```sql
SELECT refresh_table_docs();
```

### **Check for Missing Tables**
```sql
SELECT * FROM check_missing_table_docs();
```

### **View Freshness**
```sql
SELECT * FROM get_view_freshness();
```

## Integration with Development Workflow

### **Before Debugging Data Issues**
1. ✅ Check admin dashboard: `/admin/table-docs-monitor`
2. ✅ Verify system health: `GET /api/admin/table-docs-health`
3. ✅ Refresh if needed: `POST /api/admin/refresh-table-docs`
4. ✅ Then proceed with code debugging

### **After Schema Changes**
1. ✅ Run migration/DDL changes
2. ✅ Refresh documentation: `POST /api/admin/refresh-table-docs`
3. ✅ Verify changes in API: `GET /api/db-docs`
4. ✅ Test affected endpoints

### **Code Review Checklist**
- [ ] Documentation system is healthy
- [ ] New tables appear in `/api/db-docs`
- [ ] No missing table warnings
- [ ] Performance metrics are normal

## Support & Escalation

### **Level 1: Self-Service**
- Use admin dashboard: `/admin/table-docs-monitor`
- Run health checks and refreshes
- Check this documentation

### **Level 2: Database Admin**
- Direct SQL access for materialized view issues
- Schema permission problems
- Performance optimization

### **Level 3: Development Team**
- Code-level integration issues
- API endpoint problems
- System architecture questions

---

## 🎯 **Remember: Check Database Documentation FIRST**

**Before spending hours debugging code, spend 2 minutes checking the database documentation system. Most data-related issues are caused by stale or missing documentation data.**

**Quick Reference:**
- **Dashboard**: `http://localhost:3002/admin/table-docs-monitor`
- **Health Check**: `GET /api/admin/table-docs-health`
- **Refresh**: `POST /api/admin/refresh-table-docs`
- **Documentation**: `GET /api/db-docs`
