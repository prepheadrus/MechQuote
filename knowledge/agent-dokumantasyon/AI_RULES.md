# AI Protocol: Knowledge Base Maintenance

**MANDATORY INSTRUCTION FOR AI AGENTS:**

To ensure the technical memory of this project (`MechQuote`) is preserved and grows, you must adhere to the following protocol in **EVERY** session:

1.  **Trigger Events**: Whenever you:
    *   Fix a critical or complex bug (e.g., recursive loops, type mismatches, data persistence issues).
    *   Make an architectural decision (e.g., changing folder structure, adopting a new library, database schema changes).
    *   Implement a complex algorithm (e.g., PDF parsing logic, tax calculations).
    *   **Modify Project Status**: Any change to project stages MUST be recorded in `ProjectStatusHistory` via `addProjectStatusHistory` or the updated `updateProject` action to maintain the timeline integrity.

2.  **Action**: You MUST immediately document this in the `.agent/knowledge/` directory.

3.  **Format**:
    *   Create a new Markdown file: `.agent/knowledge/[topic-slug].md`.
    *   Include YAML frontmatter:
        ```yaml
        ---
        title: [Human Readable Title]
        summary: [Brief description of the solution/decision]
        ---
        ```
    *   Content Structure:
        *   **Problem/Context**: What was the issue?
        *   **Solution**: How was it fixed? (Include code snippets).
        *   **Reasoning**: Why was this approach chosen?

4.  **Verification**: Before finishing a task, ask yourself: "Is this information valuable for the future?" If yes, document it.

*This file serves as a persistent instruction for all future AI sessions.*
