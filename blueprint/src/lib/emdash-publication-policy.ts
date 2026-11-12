import { definePlugin } from "emdash";
import type { PluginContext, PluginDescriptor } from "emdash";
import { changeDataSchema } from "./emdash-change-record";
import { triggerCloudflareDeployHook } from "./cloudflare-deploy-hook";

const PLUGIN_ID = "volleybro-blueprint-publication-policy";
const PLUGIN_VERSION = "1.0.0";
const BUILD_HOOK_SETTING = "cloudflareBuildDeployHookUrl";
export const MAX_MEDIA_UPLOAD_BYTES = 20 * 1024 * 1024;

export function emdashPublicationPolicy(entrypoint: string): PluginDescriptor {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    format: "native",
    entrypoint,
  };
}

async function requestBlueprintBuild(
  collection: string,
  context: PluginContext,
): Promise<void> {
  if (collection !== "blueprint_changes") return;

  const deployHookUrl = await context.settings.get<string>(BUILD_HOOK_SETTING);
  if (
    typeof deployHookUrl !== "string" ||
    !deployHookUrl.trim() ||
    !context.http
  ) {
    context.log.warn("Blueprint build hook is not configured", { collection });
    return;
  }

  try {
    const result = await triggerCloudflareDeployHook(
      deployHookUrl,
      context.http,
    );
    context.log.info("Blueprint build requested", {
      collection,
      buildUuid: result.buildUuid,
      alreadyExists: result.alreadyExists,
    });
  } catch {
    context.log.error("Blueprint build hook request failed", { collection });
  }
}

export function createPlugin() {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: [
      "content:write",
      "content:read",
      "hooks.content-policy:register",
      "network:request",
      "media:write",
    ],
    allowedHosts: ["api.cloudflare.com"],
    admin: {
      settingsSchema: {
        [BUILD_HOOK_SETTING]: {
          type: "secret",
          label: "Cloudflare build hook URL",
          description:
            "Secret URL used to request a Workers Build after Change content changes.",
        },
      },
    },
    hooks: {
      "content:afterSave": async (event, context) => {
        await requestBlueprintBuild(event.collection, context);
      },
      "content:afterDelete": async (event, context) => {
        await requestBlueprintBuild(event.collection, context);
      },
      "content:afterPublish": async (event, context) => {
        await requestBlueprintBuild(event.collection, context);
      },
      "content:afterUnpublish": async (event, context) => {
        await requestBlueprintBuild(event.collection, context);
      },
      "media:beforeUpload": async (event) => {
        if (event.file.size > MAX_MEDIA_UPLOAD_BYTES)
          throw new Error("Upload exceeds the 20 MiB Blueprint media limit.");
        return event.file;
      },
      "content:beforePublish": async (event) => {
        if (event.collection !== "blueprint_changes") return;

        const parsed = changeDataSchema.safeParse(event.content.data);
        if (!parsed.success) {
          return {
            cancel: true,
            reason:
              "Change content does not match the published EmDash schema.",
          };
        }

        const revision =
          typeof event.content.draftRevisionId === "string"
            ? event.content.draftRevisionId
            : "";
        if (!revision) {
          return {
            cancel: true,
            reason: "Publish requires an exact saved draft revision.",
          };
        }
      },
    },
  });
}
