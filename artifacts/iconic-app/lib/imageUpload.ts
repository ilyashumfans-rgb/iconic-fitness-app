import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

type UploadImageKind = "avatar" | "photo";

type Dimensions = {
  width?: number | null;
  height?: number | null;
};

export type PreparedMobileImage = {
  uri: string;
  width: number;
  height: number;
  base64: string;
  byteSize: number;
};

const PRESETS: Record<UploadImageKind, { maxDimension: number; targetBytes: number }> = {
  avatar: { maxDimension: 512, targetBytes: 200 * 1024 },
  photo: { maxDimension: 1280, targetBytes: 500 * 1024 },
};

async function loadDimensions(uri: string): Promise<Required<Dimensions> | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    );
  });
}

function resizeAction(
  maxDimension: number,
  dimensions: Dimensions | null,
): ImageManipulator.Action {
  // Supplying just one side keeps the original aspect ratio. This ensures a
  // portrait is capped by height and a landscape by width rather than stretched.
  if (dimensions?.height && dimensions?.width && dimensions.height > dimensions.width) {
    return { resize: { height: maxDimension } };
  }
  return { resize: { width: maxDimension } };
}

async function render(
  uri: string,
  maxDimension: number,
  quality: number,
  dimensions: Dimensions | null,
): Promise<PreparedMobileImage> {
  let result = await ImageManipulator.manipulateAsync(
    uri,
    [resizeAction(maxDimension, dimensions)],
    {
      base64: true,
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  // A local URI can occasionally not report dimensions up front. Verify the
  // output and make a second aspect-preserving pass instead of sending an
  // uncapped portrait image.
  if (Math.max(result.width, result.height) > maxDimension) {
    result = await ImageManipulator.manipulateAsync(
      result.uri,
      [resizeAction(maxDimension, result)],
      {
        base64: true,
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
  }

  if (!result.base64) {
    throw new Error("Could not prepare this photo for upload");
  }
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    base64: result.base64,
    byteSize: Math.floor((result.base64.length * 3) / 4),
  };
}

/**
 * Prepares every mobile photo before it crosses the network. The picker crop
 * happens first; this only performs an aspect-preserving resize and bounded
 * JPEG quality pass. It returns both the local file URI (for binary endpoints)
 * and base64 (for the private Community endpoint).
 */
export async function prepareMobileImageForUpload(
  uri: string,
  kind: UploadImageKind,
  dimensions: Dimensions = {},
): Promise<PreparedMobileImage> {
  const preset = PRESETS[kind];
  const sourceDimensions =
    dimensions.width && dimensions.height ? dimensions : await loadDimensions(uri);
  let maxDimension = preset.maxDimension;
  let quality = 0.78;
  let prepared: PreparedMobileImage | null = null;

  // Prefer quality reductions first. Only lower dimensions after reaching the
  // quality floor, preserving useful detail whenever the target is attainable.
  while (true) {
    prepared = await render(uri, maxDimension, quality, sourceDimensions);
    if (prepared.byteSize <= preset.targetBytes) return prepared;
    if (quality > 0.52) {
      quality = Math.max(0.52, quality - 0.1);
      continue;
    }
    const minDimension = kind === "avatar" ? 384 : 768;
    if (maxDimension <= minDimension) return prepared;
    maxDimension = Math.max(minDimension, Math.round(maxDimension * 0.8));
  }
}