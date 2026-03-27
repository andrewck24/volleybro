import Image from "next/image";
import type { ReactNode } from "react";
import { FiUser } from "react-icons/fi";

import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

interface PersonItemProps {
  name: string;
  image?: string;
  children?: ReactNode;
}

export function PersonItem({ name, image, children }: PersonItemProps) {
  return (
    <>
      <ItemMedia variant="image">
        {image ? (
          <Image src={image} alt={name} width={40} height={40} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FiUser className="h-4 w-4" />
          </div>
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{name}</ItemTitle>
        {children}
      </ItemContent>
    </>
  );
}

export function PersonItemSkeleton() {
  return (
    <Item>
      <ItemMedia variant="image" data-testid="person-item-skeleton-media">
        <Skeleton className="h-full w-full" />
      </ItemMedia>
      <ItemContent data-testid="person-item-skeleton-content">
        <Skeleton className="h-4 w-24" />
      </ItemContent>
    </Item>
  );
}
