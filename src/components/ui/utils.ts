import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn UI 컴포넌트들이 공통으로 사용하는 className 유틸 함수
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
