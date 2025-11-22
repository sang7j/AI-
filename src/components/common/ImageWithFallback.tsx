// src/components/common/ImageWithFallback.tsx
import React, { useState } from "react";

// 이미지 로딩 실패 시 사용할 기본 SVG (에러 이미지)
const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCA4OCA4OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMu\nb3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjRTZFOEU4IiBkPSJNMCAwaDg4djg4SDB6Ii8+PHBhdGggZD0iTTQyIDY0Yy0xLjEgMC0yLS45LTItMnYtNGMwLTEuMS45LTIgMi0y\nczIgLjkgMiAydjRjMCAxLjEtLjkgMi0yIDJ6bTAgLThoMGMtMS4xIDAtMi0uOS0yLTJWMjRjMC0xLjEuOS0yIDItMmgxYzEuMSAwIDIgLjkgMiAydjMwYzAgMS4xLS45IDItMiAy\nem0wIDAiIGZpbGw9IiNBNUE2QTQiLz48Y2lyY2xlIGN4PSIzNSIgY3k9IjMyIiByPSI3IiBzdHJva2U9IiM5NUE1QUMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjxw\nYXRoIGQ9Ik01MCA0MmMtMS40LTQuMi00LjctNy0xMi03cy0xMC42IDIuOC0xMiA3IiBzdHJva2U9IiM5NUE1QUMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjxjaXJj\nbGUgY3g9IjM1IiBjeT0iMzIiIHI9IjciIGZpbGw9IiNGRkYiIG9wYWNpdHk9Ii4yIi8+PGNpcmNsZSBjeD0iNTMiIGN5PSIzNSIgcj0iNyIgZmlsbD0iI0ZGRiIgb3BhY2l0eT0i\nLjIiLz48L3N2Zz4K";

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const { src, alt, style, className, ...rest } = props;

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${
        className ?? ""
      }`}
      style={style}
    >
      <div className="flex h-full w-full items-center justify-center">
        <img
          src={ERROR_IMG_SRC}
          alt="Error loading image"
          {...rest}
          data-original-url={src}
        />
      </div>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}