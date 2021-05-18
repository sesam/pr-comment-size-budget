import { context, getOctokit } from "@actions/github";
const core = require("@actions/core");
const { promises } = require("fs");
const path = require("path");
const fastFolderSize = require("fast-folder-size");

const getIdentifier = () =>
  `<!-- ${core.getInput("identifier") || "PR_SIZE_CHANGE_COMMENT"} -->`;

const getFileContent = async () => {
  const file = core.getInput("file");
  if (!file) return null;
  const filePath = path.resolve(process.cwd(), `.github/workflows/${file}`);
  return await promises.readFile(filePath, "utf8");
};

function formatSize(size) {
  return `${Math.floor(size / 1000) / 1000}kB`;
}

function getSize() {
  const buildFolder = path.resolve(
    process.cwd(),
    core.getInput("budgeted_folder") || "build"
  );

  let size;
  fastFolderSize(buildFolder, (err, bytes) => {
    if (err) throw err;
    size = bytes;
  });
  return size;
}

function processContent(content) {
  // Example: {verdict} - build size is {size} vs budgeted {budget}
  const budget = parseFloat(core.getInput("budget"));

  const size = getSize();

  const map = {
    budget: formatSize(budget),
    size: formatSize(size),
    verdict: size < budget ? "✅ OK" : "🛑 Over size budget",
  };

  return content.replace(/{\w+}/g, (string) => {
    const key = string.substring(1, string.length - 1);
    return map[key] || `(${key})`;
  });
}

async function getBody() {
  const content = await getFileContent();
  if (!content) throw new Error(`No content from processing ${file}`);

  return `${getIdentifier()}\n${processContent(content)}`;
}

async function findComment(client) {
  if (!client.issues) return;
  const comments = await client.issues.listComments({
    owner: context.issue.owner,
    repo: context.issue.repo,
    issue_number: context.issue.number,
  });

  const identifier = getIdentifier();

  for (const comment of comments.data) {
    if (comment.body.startsWith(identifier)) {
      return comment.id;
    }
  }
}

const githubToken = process.env.GITHUB_TOKEN;
async function getClient() {
  if (!githubToken) throw new Error("No github token provided");
  if (!context.issue.number) throw new Error("No issue number found.");

  const client = getOctokit(githubToken);
  if (!client) throw new Error("Failed to create client.");

  return client;
}

const comment = async (client) => {
  const singleComment = core.getInput("single_comment") === "true";
  const comment_id = singleComment && (await findComment(client));
  const body = await getBody();

  if (comment_id) {
    await client.issues.updateComment({
      body,
      comment_id,
      owner: context.issue.owner,
      repo: context.issue.repo,
    });
    core.setOutput("commented", "true");
  } else {
    await client.issues.createComment({
      body,
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
    });
  }
};

const run = async () => {
  try {
    await comment(getClient());
    core.setOutput("commented", "true");
  } catch (error) {
    core.setOutput("commented", "false");
    core.setFailed(error.message);
  }
};

run();
