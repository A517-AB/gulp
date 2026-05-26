 Conversation with Gemini


Types Reference


This page documents all data types used in the Jules REST API.

Core Resources

Session


A session represents a unit of work where Jules executes a coding task.

Session


A session is a contiguous amount of work within the same context.

name

string


Output only. The full resource name (e.g., 'sessions/{session}').

id

string


Output only. The session ID.

prompt

required string


The task description for Jules to execute.

title

string


Optional title. If not provided, the system generates one.

state

SessionState


Output only. Current state of the session.

url

string


Output only. URL to view the session in the Jules web app.

sourceContext

required SourceContext


The source repository and branch context.

requirePlanApproval

boolean


Input only. If true, plans require explicit approval.

automationMode

AutomationMode


Input only. Automation mode for the session.

outputs

SessionOutput []


Output only. Results of the session (e.g., pull requests).

createTime

string (google-datetime)


Output only. When the session was created.

updateTime

string (google-datetime)


Output only. When the session was last updated.

SessionState


Enum representing the current state of a session:

Value Description

STATE_UNSPECIFIED State is unspecified

QUEUED Session is waiting to be processed

PLANNING Jules is creating a plan

AWAITING_PLAN_APPROVAL Plan is ready for user approval

AWAITING_USER_FEEDBACK Jules needs user input

IN_PROGRESS Jules is actively working

PAUSED Session is paused

FAILED Session failed

COMPLETED Session completed successfully

AutomationMode


Enum for session automation settings:

Value Description

AUTOMATION_MODE_UNSPECIFIED No automation (default)

AUTO_CREATE_PR Automatically create a pull request when code changes are ready

Activity


An activity represents a single event within a session.

Activity


An activity is a single unit of work within a session.

name

string


The full resource name (e.g., 'sessions/{session}/activities/{activity}').

id

string


Output only. The activity ID.

originator

string


The entity that created this activity ('user', 'agent', or 'system').

description

string


Output only. A description of this activity.

createTime

string (google-datetime)


Output only. When the activity was created.

artifacts

Artifact []


Output only. Artifacts produced by this activity.

planGenerated

PlanGenerated


A plan was generated.

planApproved

PlanApproved


A plan was approved.

userMessaged

UserMessaged


The user posted a message.

agentMessaged

AgentMessaged


Jules posted a message.

progressUpdated

ProgressUpdated


A progress update occurred.

sessionCompleted

SessionCompleted


The session completed.

sessionFailed

SessionFailed


The session failed.

Source


A source represents a connected repository.

Source


An input source of data for a session.

name

string


The full resource name (e.g., 'sources/{source}').

id

string


Output only. The source ID.

githubRepo

GitHubRepo


GitHub repository details.

Plans

Plan

Plan


A sequence of steps that Jules will take to complete the task.

id

string


Output only. Unique ID for this plan within a session.

steps

PlanStep []


Output only. The steps in the plan.

createTime

string (google-datetime)


Output only. When the plan was created.

PlanStep

PlanStep


A single step in a plan.

id

string


Output only. Unique ID for this step within a plan.

index

integer (int32)


Output only. 0-based index in the plan.

title

string


Output only. The title of the step.

description

string


Output only. Detailed description of the step.

Artifacts

Artifact

Artifact


A single unit of data produced by an activity.

changeSet

ChangeSet


Code changes produced.

bashOutput

BashOutput


Command output produced.

media

Media


Media file produced (e.g., image, video).

ChangeSet

ChangeSet


A set of changes to be applied to a source.

source

string


The source this change set applies to. Format: sources/{source}

gitPatch

GitPatch


The patch in Git format.

GitPatch

GitPatch


A patch in Git format.

baseCommitId

string


The commit ID the patch should be applied to.

unidiffPatch

string


The patch in unified diff format.

suggestedCommitMessage

string


A suggested commit message for the patch.

BashOutput

BashOutput


Output from a bash command.

command

string


The bash command that was executed.

output

string


Combined stdout and stderr output.

exitCode

integer (int32)


The exit code of the command.

Media

Media


A media file output.

mimeType

string


The MIME type of the media (e.g., 'image/png').

data

string (byte)


Base64-encoded media data.

GitHub Types

GitHubRepo

GitHubRepo


A GitHub repository.

owner

string


The repository owner (user or organization).

repo

string


The repository name.

isPrivate

boolean


Whether the repository is private.

defaultBranch

GitHubBranch


The default branch.

branches

GitHubBranch []


List of active branches.

GitHubBranch

GitHubBranch


A GitHub branch.

displayName

string


The branch name.

GitHubRepoContext

GitHubRepoContext


Context for using a GitHub repo in a session.

startingBranch

required string


The branch to start the session from.

Context Types

SourceContext

SourceContext


Context for how to use a source in a session.

source

required string


The source resource name. Format: sources/{source}

githubRepoContext

GitHubRepoContext


Context for GitHub repositories.

Output Types

SessionOutput

SessionOutput


An output of a session.

pullRequest

PullRequest


A pull request created by the session.

PullRequest

PullRequest


A pull request.

url

string


The URL of the pull request.

title

string


The title of the pull request.

description

string


The description of the pull request.

Activity Event Types

PlanGenerated

PlanGenerated


A plan was generated.

plan

Plan


The generated plan.

PlanApproved

PlanApproved


A plan was approved.

planId

string


The ID of the approved plan.

UserMessaged

UserMessaged


The user posted a message.

userMessage

string


The message content.

AgentMessaged

AgentMessaged


Jules posted a message.

agentMessage

string


The message content.

ProgressUpdated

ProgressUpdated


A progress update occurred.

title

string


The title of the update.

description

string


Details about the progress.

SessionCompleted

SessionCompleted


The session completed successfully.


No additional properties.

SessionFailed

SessionFailed


The session failed.

reason

string


The reason for the failure.

Request/Response Types

SendMessageRequest

SendMessageRequest


Request to send a message to a session.

prompt

required string


The message to send.

SendMessageResponse

SendMessageResponse


Response from sending a message.


Empty response on success.

ApprovePlanRequest

ApprovePlanRequest


Request to approve a plan.


Empty request body.

ApprovePlanResponse

ApprovePlanResponse


Response from approving a plan.


Empty response on success.

ListSessionsResponse

ListSessionsResponse


Response from listing sessions.

sessions

Session []


The list of sessions.

nextPageToken

string


Token for the next page of results.

ListActivitiesResponse

ListActivitiesResponse


Response from listing activities.

activities

Activity []


The list of activities.

nextPageToken

string


Token for the next page of results.

ListSourcesResponse

ListSourcesResponse


Response from listing sources.

sources

Source []


The list of sources.

nextPageToken

string


Token for the next page of results.

make an md for me
Python

markdown_content = """# Jules REST API - Types Reference

This document details all data types used in the Jules REST API.

## Core Resources

### Session
A session represents a unit of work where Jules executes a coding task. It is a contiguous amount of work within the same context.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Output only. The full resource name (e.g., 'sessions/{session}'). |
| `id` | string | Output only. The session ID. |
| `prompt` | required string | The task description for Jules to execute. |
| `title` | string | Optional title. If not provided, the system generates one. |
| `state` | `SessionState` | Output only. Current state of the session. |
| `url` | string | Output only. URL to view the session in the Jules web app. |
| `sourceContext` | required `SourceContext` | The source repository and branch context. |
| `requirePlanApproval` | boolean | Input only. If true, plans require explicit approval. |
| `automationMode` | `AutomationMode` | Input only. Automation mode for the session. |
| `outputs` | `SessionOutput []` | Output only. Results of the session (e.g., pull requests). |
| `createTime` | string (google-datetime) | Output only. When the session was created. |
| `updateTime` | string (google-datetime) | Output only. When the session was last updated. |

### SessionState
Enum representing the current state of a session:

| Value | Description |
| :--- | :--- |
| `STATE_UNSPECIFIED` | State is unspecified |
| `QUEUED` | Session is waiting to be processed |
| `PLANNING` | Jules is creating a plan |
| `AWAITING_PLAN_APPROVAL` | Plan is ready for user approval |
| `AWAITING_USER_FEEDBACK` | Jules needs user input |
| `IN_PROGRESS` | Jules is actively working |
| `PAUSED` | Session is paused |
| `FAILED` | Session failed |
| `COMPLETED` | Session completed successfully |

### AutomationMode
Enum for session automation settings:

| Value | Description |
| :--- | :--- |
| `AUTOMATION_MODE_UNSPECIFIED` | No automation (default) |
| `AUTO_CREATE_PR` | Automatically create a pull request when code changes are ready |

### Activity
An activity is a single unit of work within a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | The full resource name (e.g., 'sessions/{session}/activities/{activity}'). |
| `id` | string | Output only. The activity ID. |
| `originator` | string | The entity that created this activity ('user', 'agent', or 'system'). |
| `description` | string | Output only. A description of this activity. |
| `createTime` | string (google-datetime) | Output only. When the activity was created. |
| `artifacts` | `Artifact []` | Output only. Artifacts produced by this activity. |
| `planGenerated` | `PlanGenerated` | A plan was generated. |
| `planApproved` | `PlanApproved` | A plan was approved. |
| `userMessaged` | `UserMessaged` | The user posted a message. |
| `agentMessaged` | `AgentMessaged` | Jules posted a message. |
| `progressUpdated` | `ProgressUpdated` | A progress update occurred. |
| `sessionCompleted` | `SessionCompleted` | The session completed. |
| `sessionFailed` | `SessionFailed` | The session failed. |

### Source
An input source of data for a session representing a connected repository.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | The full resource name (e.g., 'sources/{source}'). |
| `id` | string | Output only. The source ID. |
| `githubRepo` | `GitHubRepo` | GitHub repository details. |

---

## Plans

### Plan
A sequence of steps that Jules will take to complete the task.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Output only. Unique ID for this plan within a session. |
| `steps` | `PlanStep []` | Output only. The steps in the plan. |
| `createTime` | string (google-datetime) | Output only. When the plan was created. |

### PlanStep
A single step in a plan.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Output only. Unique ID for this step within a plan. |
| `index` | integer (int32) | Output only. 0-based index in the plan. |
| `title` | string | Output only. The title of the step. |
| `description` | string | Output only. Detailed description of the step. |

---

## Artifacts

### Artifact
A single unit of data produced by an activity.

| Field | Type | Description |
| :--- | :--- | :--- |
| `changeSet` | `ChangeSet` | Code changes produced. |
| `bashOutput` | `BashOutput` | Command output produced. |
| `media` | `Media` | Media file produced (e.g., image, video). |

### ChangeSet
A set of changes to be applied to a source.

| Field | Type | Description |
| :--- | :--- | :--- |
| `source` | string | The source this change set applies to. Format: `sources/{source}` |
| `gitPatch` | `GitPatch` | The patch in Git format. |

### GitPatch
A patch in Git format.

| Field | Type | Description |
| :--- | :--- | :--- |
| `baseCommitId` | string | The commit ID the patch should be applied to. |
| `unidiffPatch` | string | The patch in unified diff format. |
| `suggestedCommitMessage` | string | A suggested commit message for the patch. |

### BashOutput
Output from a bash command.

| Field | Type | Description |
| :--- | :--- | :--- |
| `command` | string | The bash command that was executed. |
| `output` | string | Combined stdout and stderr output. |
| `exitCode` | integer (int32) | The exit code of the command. |

### Media
A media file output.

| Field | Type | Description |
| :--- | :--- | :--- |
| `mimeType` | string | The MIME type of the media (e.g., 'image/png'). |
| `data` | string (byte) | Base64-encoded media data. |

---

## GitHub Types

### GitHubRepo
A GitHub repository.

| Field | Type | Description |
| :--- | :--- | :--- |
| `owner` | string | The repository owner (user or organization). |
| `repo` | string | The repository name. |
| `isPrivate` | boolean | Whether the repository is private. |
| `defaultBranch` | `GitHubBranch` | The default branch. |
| `branches` | `GitHubBranch []` | List of active branches. |

### GitHubBranch
A GitHub branch.

| Field | Type | Description |
| :--- | :--- | :--- |
| `displayName` | string | The branch name. |

### GitHubRepoContext
Context for using a GitHub repo in a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `startingBranch` | required string | The branch to start the session from. |

---

## Context Types

### SourceContext
Context for how to use a source in a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `source` | required string | The source resource name. Format: `sources/{source}` |
| `githubRepoContext` | `GitHubRepoContext` | Context for GitHub repositories. |

---

## Output Types

### SessionOutput
An output of a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `pullRequest` | `PullRequest` | A pull request created by the session. |

### PullRequest
A pull request.

| Field | Type | Description |
| :--- | :--- | :--- |
| `url` | string | The URL of the pull request. |
| `title` | string | The title of the pull request. |
| `description` | string | The description of the pull request. |

---

## Activity Event Types

* **PlanGenerated**: A plan was generated.
    * `plan` (`Plan`): The generated plan.
* **PlanApproved**: A plan was approved.
    * `planId` (string): The ID of the approved plan.
* **UserMessaged**: The user posted a message.
    * `userMessage` (string): The message content.
* **AgentMessaged**: Jules posted a message.
    * `agentMessage` (string): The message content.
* **ProgressUpdated**: A progress update occurred.
    * `title` (string): The title of the update.
    * `description` (string): Details about the progress.
* **SessionCompleted**: The session completed successfully. (No additional properties)
* **SessionFailed**: The session failed.
    * `reason` (string): The reason for the failure.

---

## Request/Response Types

### SendMessageRequest
Request to send a message to a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `prompt` | required string | The message to send. |

### SendMessageResponse
Response from sending a message. (Empty response on success)

### ApprovePlanRequest
Request to approve a plan. (Empty request body)

### ApprovePlanResponse
Response from approving a plan. (Empty response on success)

### ListSessionsResponse
Response from listing sessions.

| Field | Type | Description |
| :--- | :--- | :--- |
| `sessions` | `Session []` | The list of sessions. |
| `nextPageToken` | string | Token for the next page of results. |

### ListActivitiesResponse
Response from listing activities.

| Field | Type | Description |
| :--- | :--- | :--- |
| `activities` | `Activity []` | The list of activities. |
| `nextPageToken` | string | Token for the next page of results. |

### ListSourcesResponse
Response from listing sources.

| Field | Type | Description |
| :--- | :--- | :--- |
| `sources` | `Source []` | The list of sources. |
| `nextPageToken` | string | Token for the next page of results. |
"""

file_path = "/mnt/data/jules_api_types_reference.md"
with open(file_path, "w") as f:
    f.write(markdown_content)

print(f"File generated at {file_path}")


Code output

File generated at /mnt/data/jules_api_types_reference.md

Your MD file is ready
MD icon
 jules_api_..._reference 
MD

The entire reference has been structured with clear tables and concise formatting to ensure all properties and data types remain intact and easily readable.


Gemini is AI and can make mistakes, including about people. Your privacy & Gemini Opens in a new window

# Jules REST API - Types Reference

This document details all data types used in the Jules REST API.

## Core Resources

### Session
A session represents a unit of work where Jules executes a coding task. It is a contiguous amount of work within the same context.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Output only. The full resource name (e.g., 'sessions/{session}'). |
| `id` | string | Output only. The session ID. |
| `prompt` | required string | The task description for Jules to execute. |
| `title` | string | Optional title. If not provided, the system generates one. |
| `state` | `SessionState` | Output only. Current state of the session. |
| `url` | string | Output only. URL to view the session in the Jules web app. |
| `sourceContext` | required `SourceContext` | The source repository and branch context. |
| `requirePlanApproval` | boolean | Input only. If true, plans require explicit approval. |
| `automationMode` | `AutomationMode` | Input only. Automation mode for the session. |
| `outputs` | `SessionOutput []` | Output only. Results of the session (e.g., pull requests). |
| `createTime` | string (google-datetime) | Output only. When the session was created. |
| `updateTime` | string (google-datetime) | Output only. When the session was last updated. |

### SessionState
Enum representing the current state of a session:

| Value | Description |
| :--- | :--- |
| `STATE_UNSPECIFIED` | State is unspecified |
| `QUEUED` | Session is waiting to be processed |
| `PLANNING` | Jules is creating a plan |
| `AWAITING_PLAN_APPROVAL` | Plan is ready for user approval |
| `AWAITING_USER_FEEDBACK` | Jules needs user input |
| `IN_PROGRESS` | Jules is actively working |
| `PAUSED` | Session is paused |
| `FAILED` | Session failed |
| `COMPLETED` | Session completed successfully |

### AutomationMode
Enum for session automation settings:

| Value | Description |
| :--- | :--- |
| `AUTOMATION_MODE_UNSPECIFIED` | No automation (default) |
| `AUTO_CREATE_PR` | Automatically create a pull request when code changes are ready |

### Activity
An activity is a single unit of work within a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | The full resource name (e.g., 'sessions/{session}/activities/{activity}'). |
| `id` | string | Output only. The activity ID. |
| `originator` | string | The entity that created this activity ('user', 'agent', or 'system'). |
| `description` | string | Output only. A description of this activity. |
| `createTime` | string (google-datetime) | Output only. When the activity was created. |
| `artifacts` | `Artifact []` | Output only. Artifacts produced by this activity. |
| `planGenerated` | `PlanGenerated` | A plan was generated. |
| `planApproved` | `PlanApproved` | A plan was approved. |
| `userMessaged` | `UserMessaged` | The user posted a message. |
| `agentMessaged` | `AgentMessaged` | Jules posted a message. |
| `progressUpdated` | `ProgressUpdated` | A progress update occurred. |
| `sessionCompleted` | `SessionCompleted` | The session completed. |
| `sessionFailed` | `SessionFailed` | The session failed. |

### Source
An input source of data for a session representing a connected repository.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | The full resource name (e.g., 'sources/{source}'). |
| `id` | string | Output only. The source ID. |
| `githubRepo` | `GitHubRepo` | GitHub repository details. |

---

## Plans

### Plan
A sequence of steps that Jules will take to complete the task.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Output only. Unique ID for this plan within a session. |
| `steps` | `PlanStep []` | Output only. The steps in the plan. |
| `createTime` | string (google-datetime) | Output only. When the plan was created. |

### PlanStep
A single step in a plan.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Output only. Unique ID for this step within a plan. |
| `index` | integer (int32) | Output only. 0-based index in the plan. |
| `title` | string | Output only. The title of the step. |
| `description` | string | Output only. Detailed description of the step. |

---

## Artifacts

### Artifact
A single unit of data produced by an activity.

| Field | Type | Description |
| :--- | :--- | :--- |
| `changeSet` | `ChangeSet` | Code changes produced. |
| `bashOutput` | `BashOutput` | Command output produced. |
| `media` | `Media` | Media file produced (e.g., image, video). |

### ChangeSet
A set of changes to be applied to a source.

| Field | Type | Description |
| :--- | :--- | :--- |
| `source` | string | The source this change set applies to. Format: `sources/{source}` |
| `gitPatch` | `GitPatch` | The patch in Git format. |

### GitPatch
A patch in Git format.

| Field | Type | Description |
| :--- | :--- | :--- |
| `baseCommitId` | string | The commit ID the patch should be applied to. |
| `unidiffPatch` | string | The patch in unified diff format. |
| `suggestedCommitMessage` | string | A suggested commit message for the patch. |

### BashOutput
Output from a bash command.

| Field | Type | Description |
| :--- | :--- | :--- |
| `command` | string | The bash command that was executed. |
| `output` | string | Combined stdout and stderr output. |
| `exitCode` | integer (int32) | The exit code of the command. |

### Media
A media file output.

| Field | Type | Description |
| :--- | :--- | :--- |
| `mimeType` | string | The MIME type of the media (e.g., 'image/png'). |
| `data` | string (byte) | Base64-encoded media data. |

---

## GitHub Types

### GitHubRepo
A GitHub repository.

| Field | Type | Description |
| :--- | :--- | :--- |
| `owner` | string | The repository owner (user or organization). |
| `repo` | string | The repository name. |
| `isPrivate` | boolean | Whether the repository is private. |
| `defaultBranch` | `GitHubBranch` | The default branch. |
| `branches` | `GitHubBranch []` | List of active branches. |

### GitHubBranch
A GitHub branch.

| Field | Type | Description |
| :--- | :--- | :--- |
| `displayName` | string | The branch name. |

### GitHubRepoContext
Context for using a GitHub repo in a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `startingBranch` | required string | The branch to start the session from. |

---

## Context Types

### SourceContext
Context for how to use a source in a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `source` | required string | The source resource name. Format: `sources/{source}` |
| `githubRepoContext` | `GitHubRepoContext` | Context for GitHub repositories. |

---

## Output Types

### SessionOutput
An output of a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `pullRequest` | `PullRequest` | A pull request created by the session. |

### PullRequest
A pull request.

| Field | Type | Description |
| :--- | :--- | :--- |
| `url` | string | The URL of the pull request. |
| `title` | string | The title of the pull request. |
| `description` | string | The description of the pull request. |

---

## Activity Event Types

* **PlanGenerated**: A plan was generated.
    * `plan` (`Plan`): The generated plan.
* **PlanApproved**: A plan was approved.
    * `planId` (string): The ID of the approved plan.
* **UserMessaged**: The user posted a message.
    * `userMessage` (string): The message content.
* **AgentMessaged**: Jules posted a message.
    * `agentMessage` (string): The message content.
* **ProgressUpdated**: A progress update occurred.
    * `title` (string): The title of the update.
    * `description` (string): Details about the progress.
* **SessionCompleted**: The session completed successfully. (No additional properties)
* **SessionFailed**: The session failed.
    * `reason` (string): The reason for the failure.

---

## Request/Response Types

### SendMessageRequest
Request to send a message to a session.

| Field | Type | Description |
| :--- | :--- | :--- |
| `prompt` | required string | The message to send. |

### SendMessageResponse
Response from sending a message. (Empty response on success)

### ApprovePlanRequest
Request to approve a plan. (Empty request body)

### ApprovePlanResponse
Response from approving a plan. (Empty response on success)

### ListSessionsResponse
Response from listing sessions.

| Field | Type | Description |
| :--- | :--- | :--- |
| `sessions` | `Session []` | The list of sessions. |
| `nextPageToken` | string | Token for the next page of results. |

### ListActivitiesResponse
Response from listing activities.

| Field | Type | Description |
| :--- | :--- | :--- |
| `activities` | `Activity []` | The list of activities. |
| `nextPageToken` | string | Token for the next page of results. |

### ListSourcesResponse
Response from listing sources.

| Field | Type | Description |
| :--- | :--- | :--- |
| `sources` | `Source []` | The list of sources. |
| `nextPageToken` | string | Token for the next page of results. |

jules_api_types_reference.md
Displaying jules_api_types_reference.md.