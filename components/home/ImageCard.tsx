/* eslint-disable @next/next/no-img-element */
import { ImageCardProps } from "@/types/types";
import React from "react";

type Props = {};

function ImageCard({ src, aspectRatio, marginTop = "" }: ImageCardProps) {
  return (
    <img
      loading="lazy"
      src={src}
      alt=""
      className={`object-contain w-full aspect-[${aspectRatio}] ${marginTop}`}
    />
  );
}

export default ImageCard;
