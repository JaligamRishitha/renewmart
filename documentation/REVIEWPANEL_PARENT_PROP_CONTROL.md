# ReviewPanel Parent Prop Control Documentation

## Overview

The `ReviewPanel` component is **fully controlled** by its parent `Document Review` page. All data rendering is driven by the `reviewerRole` prop passed from the parent, along with corresponding `currentTask` and `subtasks` props.

## Architecture

```
Document Review Page (Parent)
    │
    ├─ State Management
    │   ├─ reviewerRole (current active role)
    │   ├─ currentTask (task for current role)
    │   └─ subtasks (subtasks for current role's task)
    │
    └─ Passes props to ↓
        
ReviewPanel Component (Child)
    │
    ├─ Receives Props from Parent
    │   ├─ reviewerRole → Drives ALL rendering
    │   ├─ currentTask → Task details to display
    │   └─ subtasks → Subtasks to render
    │
    └─ Renders Based on Props
        ├─ Fetches templates for reviewerRole
        ├─ Displays role-specific criteria
        ├─ Groups and displays subtasks
        └─ Shows role badge and task info
```

## Component Documentation

### File Location
`renewmart/frontend/src/pages/document-review/components/ReviewPanel.jsx`

### Component Header Comment
```javascript
/**
 * ReviewPanel Component
 * 
 * This component is FULLY CONTROLLED by the parent Document Review page.
 * All data rendering is based on the `reviewerRole` prop passed from parent.
 * 
 * Parent Props (from Document Review page):
 * - reviewerRole: Current active reviewer role (drives ALL rendering)
 * - currentTask: Task object for the current role
 * - subtasks: Subtasks array for the current role's task
 * 
 * The component will re-render whenever the parent changes these props.
 */
```

## Props Flow

### Parent → Child Props

| Prop | Type | Source | Purpose |
|------|------|--------|---------|
| `reviewerRole` | string | Parent state | Current active role (e.g., 're_sales_advisor') |
| `currentTask` | object | Parent state | Task object for the current role |
| `subtasks` | array | Parent state | Array of subtasks for the current task |
| `documentCategory` | string | Parent | Document category being reviewed |
| Callbacks | functions | Parent | Event handlers for user actions |

### How Parent Controls Child

1. **User clicks role tab in Document Review page**
   ```javascript
   handleRoleChange(newRole) // in Document Review page
   ```

2. **Parent updates state**
   ```javascript
   setReviewerRole(newRole);      // Update role
   setCurrentTask(roleTask);      // Update task
   setSubtasks(finalSubtasks);    // Update subtasks
   ```

3. **Props flow to child**
   ```jsx
   <ReviewPanel
     key={`review-${reviewerRole}-${currentTask?.task_id}-${subtasks?.length}`}
     reviewerRole={reviewerRole}           // From parent state
     currentTask={currentTask}             // From parent state
     subtasks={subtasks}                   // From parent state
     // ... other props
   />
   ```

4. **Child re-renders with new props**
   - Component remounts (due to key change)
   - Fetches new templates for new role
   - Computes new criteria
   - Groups new subtasks
   - Renders role-specific UI

## React Effects Chain

### 1. Component Mount
```javascript
useEffect(() => {
  console.log('🎬 ReviewPanel: Component mounted/remounted');
  console.log('   Props from parent:', {
    reviewerRole,
    taskId: currentTask?.task_id,
    subtasksCount: subtasks?.length
  });
}, []);
```
**Triggered**: When component first mounts or remounts (key change)

### 2. Role Prop Change Tracking
```javascript
useEffect(() => {
  console.log('👤 ReviewPanel: Parent changed reviewerRole prop to:', reviewerRole);
}, [reviewerRole]);
```
**Triggered**: Whenever parent changes `reviewerRole` prop

### 3. UI State Reset
```javascript
useEffect(() => {
  // Reset comments, ratings, etc.
  setComments('');
  setOverallRating(0);
  // ...
}, [reviewerRole, currentTask, subtasks]);
```
**Triggered**: When any parent prop changes

### 4. Template Fetching
```javascript
useEffect(() => {
  const fetchTemplates = async () => {
    const templates = await taskAPI.getSubtaskTemplates(reviewerRole);
    setTemplateSections(/* process templates */);
  };
  fetchTemplates();
}, [reviewerRole]);
```
**Triggered**: When parent changes `reviewerRole` prop  
**Purpose**: Fetch role-specific subtask templates from backend

## Computed Values (Memoized)

### Current Criteria
```javascript
const currentCriteria = React.useMemo(() => {
  return {
    title: reviewerRole === 're_sales_advisor' ? 'Market Analysis Review' :
           reviewerRole === 're_analyst' ? 'Technical & Financial Assessment' :
           // ...
    icon: /* role-specific icon */,
    sections: templateSections
  };
}, [reviewerRole, templateSections]);
```
**Dependencies**: `reviewerRole` (from parent), `templateSections` (fetched)  
**Recomputes**: When parent changes role or templates load

### Grouped Subtasks
```javascript
const groupedSubtasks = React.useMemo(() => {
  // Group parent's subtasks by section
  return Object.values(groups);
}, [subtasks, currentCriteria, reviewerRole]);
```
**Dependencies**: `subtasks` (from parent), `currentCriteria`, `reviewerRole` (from parent)  
**Recomputes**: When parent changes subtasks or role

## UI Rendering Based on Parent Props

### Role Badge (Always Shows Current Role)
```jsx
<span className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
  {reviewerRole === 're_sales_advisor' ? '🏢 RE Sales Advisor' :
   reviewerRole === 're_analyst' ? '📊 RE Analyst' :
   reviewerRole === 're_governance_lead' ? '⚖️ RE Governance Lead' :
   reviewerRole}
</span>
```
**Source**: `reviewerRole` prop from parent

### Title Display
```jsx
<h2 className="text-lg font-semibold text-foreground">
  {currentCriteria?.title}
</h2>
```
**Source**: Computed from `reviewerRole` prop

### Task Display
```jsx
<p className="text-sm font-medium text-primary mt-1">
  Task: {currentTask.title || currentTask.task_type || 'Untitled Task'}
</p>
```
**Source**: `currentTask` prop from parent

### Subtasks Display
```jsx
{groupedSubtasks?.map((section, sectionIndex) => (
  <div key={sectionIndex}>
    <h3>{section?.title}</h3>
    {section?.items?.map((item, itemIndex) => (
      // Render subtask item
    ))}
  </div>
))}
```
**Source**: Computed from `subtasks` prop from parent

## Data Flow Example

### Scenario: User switches from "RE Analyst" to "RE Sales Advisor"

#### 1. In Document Review Page (Parent)
```javascript
// User clicks RE Sales Advisor tab
handleRoleChange('re_sales_advisor')
  ↓
// Fetch task for new role
const roleTask = allTasksForLand.find(t => t.assigned_role === 're_sales_advisor')
  ↓
// Fetch subtasks for new task
const taskSubtasks = await taskAPI.getSubtasks(roleTask.task_id)
  ↓
// Update parent state
setReviewerRole('re_sales_advisor')
setCurrentTask(roleTask)
setSubtasks(taskSubtasks)
```

#### 2. Props Flow to ReviewPanel (Child)
```jsx
<ReviewPanel
  key="review-re_sales_advisor-task123-5"  // New key forces remount
  reviewerRole="re_sales_advisor"           // New role
  currentTask={/* RE Sales Advisor task */} // New task
  subtasks={/* 5 subtasks for new task */}  // New subtasks
/>
```

#### 3. In ReviewPanel Component
```javascript
// Component remounts (new key)
useEffect mount → Logs props from parent
  ↓
// Detects role prop change
useEffect [reviewerRole] → Logs role change
  ↓
// Fetches templates for new role
useEffect [reviewerRole] → fetchTemplates('re_sales_advisor')
  ↓
// Computes new criteria
useMemo currentCriteria → "Market Analysis Review", "TrendingUp" icon
  ↓
// Groups new subtasks
useMemo groupedSubtasks → Groups 5 subtasks by section
  ↓
// Renders UI
render() → Shows role badge, criteria, task, 5 subtasks
```

## Key Prop for Forced Remounting

```jsx
key={`review-${reviewerRole}-${currentTask?.task_id}-${subtasks?.length}`}
```

**Why this works**:
- Changes whenever `reviewerRole` changes
- Changes whenever `currentTask` changes
- Changes whenever number of `subtasks` changes
- Forces complete component remount, ensuring fresh render

## Console Logging

The component includes comprehensive logging to track prop flow:

```
🎬 ReviewPanel: Component mounted/remounted
   Props from parent: { reviewerRole: 're_sales_advisor', ... }

👤 ReviewPanel: Parent changed reviewerRole prop to: re_sales_advisor

🔄 ReviewPanel: Props changed from parent
   → Role: re_sales_advisor
   → Task: task123
   → Subtasks count: 5

📥 ReviewPanel: Fetching templates based on parent role prop: re_sales_advisor
📦 ReviewPanel: Received templates for re_sales_advisor

🎨 ReviewPanel: Computing criteria based on parent role: re_sales_advisor
   ✅ Criteria computed: { title: 'Market Analysis Review', ... }

📊 ReviewPanel: Grouping subtasks from parent prop
   → Grouped parent subtasks into 3 sections for role: re_sales_advisor

🎨 ReviewPanel: RENDERING based on parent props:
   Parent reviewerRole: re_sales_advisor
   Parent currentTask: task123
   Parent subtasks count: 5
   ⚡ Everything renders based on parent Document Review page props
```

## State Management

### Parent (Document Review) State
```javascript
const [reviewerRole, setReviewerRole] = useState('re_sales_advisor');
const [currentTask, setCurrentTask] = useState(null);
const [subtasks, setSubtasks] = useState([]);
```
**Source of truth**: Parent component owns all data

### Child (ReviewPanel) State
```javascript
// UI state only (not data)
const [comments, setComments] = useState('');
const [overallRating, setOverallRating] = useState(0);
const [justification, setJustification] = useState('');

// Fetched based on parent's reviewerRole
const [templateSections, setTemplateSections] = useState([]);
```
**Purpose**: Only for UI interactions, not for role data

## Supported Reviewer Roles

| Role ID | Display Name | Criteria Title | Icon |
|---------|-------------|----------------|------|
| `re_sales_advisor` | 🏢 RE Sales Advisor | Market Analysis Review | TrendingUp |
| `re_analyst` | 📊 RE Analyst | Technical & Financial Assessment | Calculator |
| `re_governance_lead` | ⚖️ RE Governance Lead | Regulatory Compliance Review | Shield |

Each role:
- Has different subtask templates fetched from backend
- Displays different criteria title and icon
- Shows different subtasks (passed from parent)
- Has separate tasks per land parcel

## Benefits of This Architecture

✅ **Single Source of Truth**: Parent owns all data  
✅ **Predictable Rendering**: Child always reflects parent's current state  
✅ **Easy Debugging**: Console logs show entire prop flow  
✅ **No State Conflicts**: Child has no competing state for role data  
✅ **Automatic Sync**: Props update triggers automatic re-render  
✅ **Complete Refresh**: Key change forces clean remount  

## Testing the Prop Flow

### How to Verify

1. **Open Document Review page**
2. **Open browser console**
3. **Click different role tabs**
4. **Observe console logs**:
   - Parent logs role change
   - Parent fetches data
   - Parent updates state
   - Child receives props
   - Child remounts
   - Child fetches templates
   - Child computes values
   - Child renders

### Expected Behavior

✅ Role badge updates immediately  
✅ Criteria title changes for each role  
✅ Icon changes for each role  
✅ Task details update  
✅ Subtasks list updates  
✅ No stale data visible  
✅ Loading overlay shows during fetch  

## Troubleshooting

### If ReviewPanel doesn't update:

1. **Check parent state**: Verify `reviewerRole` updates in parent
2. **Check prop passing**: Verify props are passed correctly to child
3. **Check key prop**: Verify key changes on role switch
4. **Check console logs**: Follow the prop flow in console
5. **Check network tab**: Verify subtasks are fetched

### Common Issues:

❌ **Child has own reviewerRole state** → Use only props  
❌ **Key doesn't include role** → Component won't remount  
❌ **Props not updated synchronously** → Check parent's `handleRoleChange`  
❌ **Stale closure in useEffect** → Check dependency arrays  

---

**Last Updated**: October 15, 2025  
**Status**: ✅ Fully Implemented and Documented  
**Related Docs**: `ROLE_SYNC_FIX_SUMMARY.md`

