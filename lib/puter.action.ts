import puter from "@heyputer/puter.js";
import {
  getOrCreateHostingConfig,
  uploadImageToHosting,
} from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

/* ===============================
   AUTH
================================ */

export const puterSignIn = async () => puter.auth.signIn();

export const puterSignOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
};

/* ===============================
   CREATE PROJECT
================================ */

export const createProject = async ({
  item,
  visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null> => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing PUTER_WORKER_URL");
    return null;
  }

  const projectId = item.id;
  const hosting = await getOrCreateHostingConfig();

  const hostedSource = projectId
    ? await uploadImageToHosting({
        hosting,
        url: item.sourceImage,
        projectId,
        label: "source",
      })
    : null;

  const hostedRender =
    projectId && item.renderedImage
      ? await uploadImageToHosting({
          hosting,
          url: item.renderedImage,
          projectId,
          label: "rendered",
        })
      : null;

  const resolvedSource =
    hostedSource?.url ||
    (isHostedUrl(item.sourceImage) ? item.sourceImage : "");

  if (!resolvedSource) {
    console.warn("Failed to host source image");
    return null;
  }

  const resolvedRender =
    hostedRender?.url ||
    (item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined);

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  const payload = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  };

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/save`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: payload,
          visibility,
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to save project:", await response.text());
      return null;
    }

    const data = await response.json();
    return data?.project ?? null;
  } catch (e) {
    console.error("createProject error:", e);
    return null;
  }
};

/* ===============================
   GET PROJECTS
================================ */

export const getProjects = async (): Promise<DesignItem[]> => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing PUTER_WORKER_URL");
    return [];
  }

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/list`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error("Failed to fetch projects:", await response.text());
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.projects) ? data.projects : [];
  } catch (e) {
    console.error("getProjects error:", e);
    return [];
  }
};

/* ===============================
   GET PROJECT BY ID
================================ */

export const getProjectById = async ({
  id,
}: {
  id: string;
}): Promise<DesignItem | null> => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing PUTER_WORKER_URL");
    return null;
  }

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error("Failed to fetch project:", await response.text());
      return null;
    }

    const data = await response.json();
    return data?.project ?? null;
  } catch (error) {
    console.error("getProjectById error:", error);
    return null;
  }
};
