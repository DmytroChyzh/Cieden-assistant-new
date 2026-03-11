**>>> MODE: DESIGN <<<**
**Command:** `do design` 
These instructions override previous ones on conflict.  
**Primary Goal:** Produce lightweight visual proposals (ASCII "wireframes") for UI changes, evaluate each through multi-agent parallel analysis with quantitative scoring, audit component reuse/creation needs, and obtain user approval before implementation.

---

## Design Process Overview

### Phase 1: Initial Design Generation
1. **Context Review & Scope Decision**
2. **Generate UI Options** (2-5 ASCII wireframes)

### Phase 2: Multi-Agent Parallel Evaluation 🚀
3. **Parallel Agent Evaluation** (13 specialized agents)
4. **Score Consolidation & Analysis**

### Phase 3: Synthesis & Decision
5. **Component Audit**
6. **Final Recommendation & Approval**

---

## PHASE 1: INITIAL DESIGN GENERATION

### 1. Context Review & Scope Decision
   * **Summarize** key findings from RESEARCH/IDEATE modes
   * **Classify Change Type:**
     - **Minor** (single-screen tweak, no new UI components) → Skip to simplified evaluation (Step 6)
     - **Major** (multi-screen, new workflow, new UI components) → Continue with full multi-agent evaluation

### 2. Generate UI Options
   * **Pre-Wireframe Analysis** (System 1 Design Thinking):
     - **Real Goal**: What's the user actually trying to accomplish? List all his Jobs to be done.
     - **How Might We**: Reframe the problem from 3 different angles
     - **Cross-Industry**: How do other industries solve similar problems?
     - **Auto-Fill**: What does the system already know that can be pre-filled?
     - **Necessity**: Which elements are truly required vs. assumed?
     - **Workflow**: What's the user's complete journey context?
   * **Produce 2-5 ASCII wireframes** for major changes
   * **Include key interactions** (click targets, navigation flows)
   * **Label components** clearly in each wireframe
   * **Document assumptions** about user context and goals

---

## PHASE 2: MULTI-AGENT PARALLEL EVALUATION 🚀 
IMPORTANT!: run multiple agents in paralel (multiple Task tool calls in a single message to run all 13 agents in 3 batches simultaneously). Make sure all options are fully analysed, restart agent if research is not high quality.

### Agent Prompt Templates

  **UX Evaluation Agent Template:**
  You are a [SPECIFIC AGENT TYPE] analyzing UI design options for [feature name]. Ultra think. 

  EVALUATE: [provide Full context of 5 ASCII wireframes]
  CRITERIA: [Specific metrics for this agent type]
  CONTEXT: [Minimal relevant context - e.g. user types/jobs, tasks, constraints]
  OUTPUT: [Exact format with scores]

  Focus solely on [AGENT'S EXPERTISE AREA]. Ignore implementation details.

### 3. Parallel Agent Evaluation Process

#### 🧠 **Research & Discovery Agent** (Industry Understanding)

**Purpose:** Analyze industry trends and competitive landscape to inform design decisions

**Process:**
1. **Industry Research:**
   - Identify 3-5 latest leading products in the wide space ( e.g. HubSpot, Instantly, Apollo, IFTTT for workflow UI in CRM etc.)
   - How other industries solve similar interactions?
   - Novel UI approaches from ANY industry related to this UI
   - What are the typical chellenges/problems users encounter with such interfaces
   - Search online for their latest relevant UX patterns for similar features
   - Analyze and Document those emerging trends in B2B software design
   -  User Sentiment: Search for "I wish [product] would..." patterns
   - **Automation Patterns**: How do leading products reduce manual work?

2. **Competitive Analysis:**
   - Search how competitors solve similar problems
   - searh online for positive and negative user feedback for this feature for competetive products
   - Identify unique approaches worth considering
   - Note common anti-patterns to avoid
   - **Simplification Examples**: What complexity have competitors eliminated?


**Output Format:**
```
RESEARCH AGENT FINDINGS:
Industry Trends: [3-5 key trends relevant to this feature]
Competitive Patterns: [Common approaches with pros/cons]
Unique Opportunities: [Gaps or improvements over competition]
Anti-patterns to Avoid: [Known bad practices]
Recommendation Weight: [High/Medium/Low] for each design option
```

---

#### 🎯 **UX Evaluation Agents** (6 Specialists)

##### **GOMS Analysis Agent**
**Purpose:** Break down user tasks into Goals, Operators, Methods, and Selection rules

**Reference:** Before starting, agent has to review the [KLM Operator Timing Cheat Sheet](https://gist.github.com/DrMerfy/73b9090926bc96a1a93d6d7087d42439) for standard operator timing values

**Process:**
1. **Task Decomposition:** For each design option, map out:
   - **Goals:** What user wants to accomplish
   - **Operators:** Basic actions (click, type, read, decide)
   - **Methods:** Sequences of operators to achieve goals
   - **Selection Rules:** How users choose between methods

2. **Time & Complexity Estimation:**
   - Count clicks, keystrokes, context switches using standard KLM timings
   - Apply mental operator insertion rules (see reference)
   - Calculate total task completion time
   - Identify bottlenecks and friction points

3. **Error Potential Analysis:**
   - Points where users might make mistakes
   - Recovery paths from errors
   - Learning curve for method mastery

**Scoring Criteria (1-10 scale):**
- Task efficiency (fewer steps = higher score)
- Error prevention (clear paths = higher score)
- Method consistency (predictable patterns = higher score)

**Output Format:**
```
GOMS AGENT EVALUATION:
Option A:
- Primary Task: [Goal description]
  - Method 1: [G→O→M→S breakdown]
  - Estimated Time: X seconds
  - Click Count: X clicks
  - Context Switches: X switches
  - Error Risk Points: [List potential failure points]
  - Efficiency Score: X/10
  - Error Prevention Score: X/10
  - Total GOMS Score: X/10

Option B: [Same format]
...
```

##### **Jobs-to-be-Done Agent**
**Purpose:** Analyze if design covers all user "jobs" and edge cases without major drawbacks

**Process:**
1. **Job Identification:** For all design options list:
   - **Jobs Context** How does it fit in his Day in the Life. How often the feature will be used, by how many users.
   - **Functional Jobs:** Core tasks user needs to with this UI. 
   - **Emotional Jobs:** How user wants to feel during/after task
   - **Social Jobs:** How user wants to be perceived by others
   - **Workflow Context**: What happened before/after this interaction?

2. ** Edge Cases:**
   - Error states and recovery scenarios
   - Empty states and first-time user experience
   - High-volume usage scenarios
   - Mobile/accessibility considerations

3. **Job Completion Analysis:**
   - Can user complete primary job efficiently?
   - Are secondary jobs supported?
   - Does design create new jobs/friction?
   - **Automation Opportunities**: What jobs can be eliminated via smart defaults?
   - **Information Inheritance**: What data already exists in the system?

**Scoring Criteria (1-10 scale):**
- Functional job coverage (complete solution = higher score)
- Emotional job satisfaction (positive experience = higher score)
- Edge case handling (design is better in handling Edge cases = higher score)

**Output Format:**
```
JOBS-TO-BE-DONE AGENT EVALUATION:
Option A:
- Functional Jobs Covered: [List with coverage %]
- Emotional Jobs Addressed: [User feelings/confidence]
- Social Jobs Supported: [Professional appearance/efficiency]
- Edge Cases Handled: [List scenarios]
- Functional Coverage Score: X/10
- Emotional Satisfaction Score: X/10
- Edge Case Robustness Score: X/10
- Total JTBD Score: X/10

Option B: [Same format]
...
```

##### **Fitts's Law and platform guidelines Agent**
**Purpose:** Calculate ease of interacting with interface elements based on size and distance

**Process:**
1. **Target Analysis:** For each interactive element:
   - Measure target size (width × height), consider wiewport left, bottom, right side edges as infinite (depending on component location on the page)
   - Calculate distance from likely previous cursor position
   - Apply Fitts's Law: Time = a + b × log₂(D/W + 1)
   - Identify touch targets <44px (mobile accessibility issue)

2. **Interaction Sequence Mapping:**
   - Map common user flows through interface
   - Calculate cumulative interaction time
   - Identify longest/most difficult reaches

3. **Optimization Opportunities:**
   - Suggest size increases for critical targets
   - Recommend proximity improvements
   - Flag interactions violating platform guidelines (e.g. is it a modern and popular pattern for web/shadcn, etc?)

**Scoring Criteria (1-10 scale):**
- Target accessibility (larger, closer = higher score)
- Flow efficiency (smooth cursor movement = higher score)
- Platform compliance (meets guidelines = higher score)

**Output Format:**
```
FITTS'S LAW AGENT EVALUATION:
Option A:
- Critical Targets Analysis:
  - Primary CTA: Size=XxY, Distance=Z, Time=Ms
  - Secondary Actions: [Similar breakdown]
- Flow Sequence Times: [Total time for common flows]
- Accessibility Violations: [Targets <44px or similar issues]
- Target Accessibility Score: X/10
- Flow Efficiency Score: X/10
- Platform Compliance Score: X/10
- Total Fitts's Score: X/10

Option B: [Same format]
...
```

##### **Cognitive Load Agent**
**Purpose:** Evaluate mental demand and identify friction points or cognitive overload

**Process:**
1. **Information Architecture Analysis:**
   - Evaluate context of the UI you are analyzing (is it a screen or sidebar? How much information we are already showing outside this component)
   - Count information elements per screen
   - Evaluate information hierarchy and grouping
   - Assess visual noise and distractions
   - Apply Miller's Rule (7±2 items per group)
   - **Elimination Audit**: Question necessity of each element
   - **Smart Defaults Analysis**: What can be pre-filled intelligently?

2. **Decision Point Analysis:**
   - Count decisions user must make
   - Evaluate decision complexity
   - Identify decision fatigue risks
   - Assess default/recommended options

3. **Memory Load Assessment:**
   - Information user must remember between screens
   - Context switching requirements
   - Progressive disclosure effectiveness
   - **Progressive Disclosure**: What can be hidden until needed?

**Scoring Criteria (1-10 scale):**
- Information density (optimal amount = higher score)
- Decision clarity (fewer, clearer choices = higher score)
- Memory efficiency (less to remember = higher score)

**Output Format:**
```
COGNITIVE LOAD AGENT EVALUATION:
Option A:
- Information Elements Count: X (optimal: 5-9 per group)
- Decision Points: X critical decisions
- Memory Requirements: [What user must remember]
- Cognitive Overload Risks: [Areas of potential overwhelm]
- Information Density Score: X/10
- Decision Clarity Score: X/10
- Memory Efficiency Score: X/10
- Total Cognitive Load Score: X/10

Option B: [Same format]
...
```

##### **Heuristic Evaluation Agent**
**Purpose:** Score design against established usability principles (Nielsen's 10 heuristics)

**Process:**
1. **Systematic Heuristic Review:** Evaluate each design against:
   - **H1:** Visibility of system status
   - **H2:** Match between system and real world
   - **H3:** User control and freedom
   - **H4:** Consistency and standards
   - **H5:** Error prevention
   - **H6:** Recognition rather than recall
   - **H7:** Flexibility and efficiency of use
   - **H8:** Aesthetic and minimalist design
   - **H9:** Help users recognize, diagnose, recover from errors
   - **H10:** Help and documentation

2. **Severity Rating:** For each violation:
   - 0: No usability problem
   - 1: Cosmetic problem only
   - 2: Minor usability problem
   - 3: Major usability problem
   - 4: Usability catastrophe

3. **Priority Ranking:** Focus on violations that:
   - Affect primary user goals
   - Occur frequently in typical usage
   - Are difficult for users to work around

**Scoring Criteria (1-10 scale):**
- Heuristic compliance (fewer violations = higher score)
- Violation severity (minor issues = higher score)
- Critical path impact (no blocking issues = higher score)

**Output Format:**
```
HEURISTIC EVALUATION AGENT:
Option A:
- H1 (System Status): Score X/10 - [Brief finding]
- H2 (Real World Match): Score X/10 - [Brief finding]
- H3 (User Control): Score X/10 - [Brief finding]
- H4 (Consistency): Score X/10 - [Brief finding]
- H5 (Error Prevention): Score X/10 - [Brief finding]
- H6 (Recognition): Score X/10 - [Brief finding]
- H7 (Efficiency): Score X/10 - [Brief finding]
- H8 (Minimalism): Score X/10 - [Brief finding]
- H9 (Error Recovery): Score X/10 - [Brief finding]
- H10 (Help/Docs): Score X/10 - [Brief finding]
- Major Violations: [List severity 3-4 issues]
- Total Heuristic Score: X/10

Option B: [Same format]
...
```

##### **Learnability Agent**
**Purpose:** Measure how quickly new users become proficient; detect steep learning curves

**Process:**
1. **First-Use Analysis:**
   - Discoverability of key features
   - understanding icons and labels
   - potential first-time user mistakes

2. **Skill Development Mapping:**
   - Shortcut/advanced feature discovery
   - Muscle memory development potential

3. **Mental Model Assessment:**
   - How quickly users understand the system
   - Metaphors and conceptual frameworks
   - Transfer from similar systems
   - Consistency with user expectations

**Scoring Criteria (1-10 scale):**
- First-use success (intuitive start = higher score)
- Skill progression (smooth learning curve = higher score)
- Mental model clarity (easy to understand = higher score)

**Output Format:**
```
LEARNABILITY AGENT EVALUATION:
Option A:
- First Success Time: X minutes for typical user
- Discovery Rate: X% of features found without help
- Learning Curve: [Steep/Moderate/Gentle]
- Mental Model Clarity: [How intuitive the system is]
- Common Learning Barriers: [List obstacles]
- First-Use Score: X/10
- Skill Progression Score: X/10
- Mental Model Score: X/10
- Total Learnability Score: X/10

Option B: [Same format]
...
```

---

#### 🎨 **UI & Visual Consistency Team** (3 Agents, make assumptions based on ASCII designs)

##### **Design System Consistency Agent**
**Purpose:** Ensure alignment with design system (tokens, spacing, component reuse)

**Process:**
1. **Component Audit:**
   - Scan existing components in `/components`, `app/_components`, `components/ui`
   - Identify reusable components for each design option
   - Flag new components needed
   - Check for component pattern deviations
   - **Template Opportunities**: What patterns can be reused/automated?
   - **Information Consolidation**: What fields can be combined?

2. **Design Token/responsiveness Compliance:**
   - Verify component will work well on multiple screen sizes or can be easily adapted

**Scoring Criteria (1-10 scale):**
- Component reuse (more reuse = higher score)
- Token compliance (strict adherence = higher score)
- Simplification score (reduced complexity = higher score)
- Automation score (eliminated manual work = higher score)

**Output Format:**
```
DESIGN SYSTEM CONSISTENCY AGENT:
Option A:
- Components Reusable: [List existing components used]
- Components to Create: [List new components needed]
- Token Violations: [Any deviations from design system]
- Pattern Inconsistencies: [Deviations from established patterns]
- Component Reuse Score: X/10
- Token Compliance Score: X/10
- Pattern Consistency Score: X/10
- Total Design System Score: X/10

Option B: [Same format]
...
```

##### **Visual Hierarchy Agent**
**Purpose:** Review element prominence and layout for proper attention flow and scannability

**Process:**
1. **Hierarchy Analysis:**
   - Map visual weight of elements (size, color, position)
   - Verify primary actions stand out most
   - Check information importance matches visual prominence
   - Assess reading flow and eye path

2. **Scannability Assessment:**
   - F-pattern and Z-pattern compliance
   - White space usage for grouping
   - Typography hierarchy effectiveness
   - Visual landmarks for navigation

3. **Attention Management:**
   - Identify potential attention conflicts
   - Verify single clear primary action per screen
   - Assess progressive disclosure implementation
   - Check for visual noise or distractions

**Scoring Criteria (1-10 scale):**
- Hierarchy clarity (clear importance order = higher score)
- Scannability (easy to scan = higher score)
- Attention focus (clear primary action = higher score)

**Output Format:**
```
VISUAL HIERARCHY AGENT:
Option A:
- Primary Action Prominence: [How well it stands out]
- Information Hierarchy: [Importance order clarity]
- Scanning Pattern: [F/Z pattern compliance]
- Attention Conflicts: [Competing elements]
- Visual Noise Level: [Distracting elements]
- Hierarchy Clarity Score: X/10
- Scannability Score: X/10
- Attention Focus Score: X/10
- Total Visual Hierarchy Score: X/10

Option B: [Same format]
...
```

---

#### 🧩 **Integration & Contextual Fit Team** (3 Agents)

##### **Contextual Awareness Agent**
**Purpose:** Understand broader business, brand, and user context for strategic alignment

**Process:**
1. **Business Context Analysis:**
   - CRM agency focus and user types
   - Sales process integration requirements
   - Workflow efficiency impact
   - Business goal alignment

2. **User Context Assessment:**
   - Primary user personas (sales teams, managers)
   - Usage frequency and intensity
   - Skill level and technical comfort
   - Multitasking and interruption scenarios


**Scoring Criteria (1-10 scale):**
- Business alignment (supports goals = higher score)
- User context fit (matches reality = higher score)
- Strategic value (high impact = higher score)

**Output Format:**
```
CONTEXTUAL AWARENESS AGENT:
Option A:
- Business Goal Support: [How it advances business objectives]
- User Reality Match: [Fit with actual usage patterns]
- Strategic Priority: [Importance vs other features]
- Context Switching Impact: [Effect on user workflow]
- Business Alignment Score: X/10
- User Context Score: X/10
- Strategic Value Score: X/10
- Total Contextual Score: X/10

Option B: [Same format]
...
```

##### **Technical Feasibility Agent**
**Purpose:** Collaborate with tech stack knowledge for implementation reality check

**Process:**
1. **Implementation Complexity:**
   - Component development effort estimation
   - Backend integration requirements
   - Third-party service dependencies
   - Performance implications

2. **Technical Risk Assessment:**
   - Browser compatibility considerations
   - Mobile responsiveness challenges
   - Accessibility implementation complexity
   - Maintenance burden

3. **Development Timeline:**
   - POC vs MVP implementation differences
   - Parallel development opportunities
   - Testing requirements
   - Deployment considerations

**Scoring Criteria (1-10 scale):**
- Implementation ease (simpler = higher score)
- Risk level (lower risk = higher score)
- Timeline efficiency (faster delivery = higher score)

**Output Format:**
```
TECHNICAL FEASIBILITY AGENT:
Option A:
- Development Effort: [Time/complexity estimate]
- Technical Risks: [Implementation challenges]
- Component Requirements: [New components needed]
- Performance Impact: [Speed/size implications]
- Implementation Ease Score: X/10
- Risk Level Score: X/10
- Timeline Efficiency Score: X/10
- Total Feasibility Score: X/10

Option B: [Same format]
...
```

##### **Marketing Fit Agent**
**Purpose:** Evaluate UI support for positioning, storytelling, and market perception

**Process:**
1. **Positioning Support:**
   - Feature differentiation potential
   - Value proposition clarity

2. **Storytelling Enhancement:**
   - Demo and presentation effectiveness
   - Marketing content opportunities

3. **Market Perception:**
   - Professional credibility impact
   - Innovation vs stability balance
   - Target market expectations
   - Industry trend alignment

**Scoring Criteria (1-10 scale):**
- Positioning strength (clear differentiation = higher score)
- Demo effectiveness (impressive presentation = higher score)
- Market fit (meets expectations = higher score)

**Output Format:**
```
MARKETING FIT AGENT:
Option A:
- Differentiation Potential: [How it sets us apart]
- Demo Impact: [Presentation effectiveness]
- Market Expectations: [Industry standard compliance]
- Sales Story Support: [How it helps sales conversations]
- Positioning Score: X/10
- Demo Effectiveness Score: X/10
- Market Fit Score: X/10
- Total Marketing Score: X/10

Option B: [Same format]
...
```

---

## PHASE 3: SYNTHESIS & DECISION

### 4. Score Consolidation & Analysis

**Consolidation Process:**
1. **Collect All Agent Scores** in standardized matrix format
2. **Calculate Weighted Averages** by category:
   - Research Weight: 10%
   - UX Evaluation: 50% (equal weight per agent)
   - UI/Visual: 25% (equal weight per agent)
   - Integration/Context: 15% (equal weight per agent)

3. **Generate Overall Scores** for each design option
4. **Identify Standout Strengths/Weaknesses** per option
5. **Flag Critical Issues** (any score below 4/10)

**Score Matrix Format:**
```
CONSOLIDATED EVALUATION MATRIX:

                    Option A  Option B  Option C
Research Agent         8.5      7.2      6.8
GOMS Agent            7.8      8.5      7.1
JTBD Agent            8.2      7.9      8.0
Fitts's Law Agent     6.5      8.8      7.3
Cognitive Load Agent  8.9      6.2      7.7
Heuristic Agent       7.6      8.1      7.9
Learnability Agent    8.3      7.4      6.9
Design System Agent   9.1      7.8      8.2
Visual Hierarchy Agent 7.7     8.6      7.5
Aesthetic Agent       8.4      7.9      8.1
Contextual Agent      8.8      7.3      7.6
Feasibility Agent     6.9      8.7      8.4
Marketing Agent       8.0      7.5      7.8

WEIGHTED AVERAGES:
Research (10%):       8.5      7.2      6.8
UX (50%):            7.9      7.8      7.5
UI/Visual (25%):     8.4      8.1      7.9
Integration (15%):   7.9      7.8      7.9

FINAL SCORES:         8.0      7.9      7.6

CRITICAL ISSUES:
Option A: Fitts's Law concerns, Feasibility risks
Option B: Cognitive Load problems
Option C: Research gaps, Learnability issues
```

### 5. Component Audit
   * **Scan** `/components`, `app/_components`, `components/ui` (shadcn) for reusable pieces
   * **Categorize** components:
     * **Reusable as-is** (no changes needed)
     * **Should be promoted to global** (currently feature-local)
     * **Need to create** (brand-new components)
   * **Document** new component requirements with priority

### 6. Final Recommendation & Approval

**Recommendation Process:**
1. **Select Leading Options or recommend other options** based on:
   - Highest overall weighted score
   - Fewest critical issues (scores <4/10)
   - Best alignment with project phase (POC vs MVP)
   - Consideration of agent feedback patterns
   - recommend improvements to winnimg designs, areas of research, zoom out and reevaluate the winner.  

2. **Justify Selection** with:
   - One-sentence primary rationale
   - Top 3 supporting agent findings
   - Acknowledged trade-offs/limitations
   - Implementation priority recommendations

3. **Documentation Guidance** for implementation:
   ```
   /**
    * WHY: One-sentence user value statement.
    * BEHAVIOR: Short description of major interactions/props.
    * EVALUATION: Reference to design evaluation results.
    */
   ```

4. **Implementation Notes:**
   - Never modify shadcn-generated source directly; extend via wrapper
   - Prioritize high-scoring component patterns
   - Address critical issues (scores <4/10) in implementation plan

---

## Completion Checklist
- [ ] Context reviewed and scope determined
- [ ] UI options generated (2-5 for major changes)
- [ ] All 13 agents completed evaluations
- [ ] Scores consolidated in matrix format
- [ ] Component audit complete
- [ ] Final recommendation with rationale stated
- [ ] Critical issues flagged for implementation
- [ ] **PAUSE** – waiting for user approval

---

## Key Design Principles

**For every UI element, agents should ask:**
1. **Why?** What user goal does this serve?
2. **Auto?** Can this be pre-filled/inherited?
3. **Combine?** Does this belong with something else?
4. **Defer?** Does this need to be here now?
5. **Eliminate?** Is this truly necessary?

## Transition
* On user confirmation → proceed to appropriate mode:
- `do planmvp` if backend architecture may require evaluation of different architectural options (libs, datamodels, etc) 
  - `do planpoc` for rapid prototyping and concept validation
  - `do planmvp` for robust, production-ready implementation

