export interface NavLinkProps {
  text: string;
}

export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export interface PricingFeature {
  icon: string;
  text: string;
}

export interface PricingPlan {
  name: string;
  description: string;
  price: string;
  features: PricingFeature[];
}

export interface SocialIconProps {
  src: string;
  alt: string;
}

export interface FooterLinkGroupProps {
  title: string;
  links: string[];
}

export interface ImageCardProps {
  src: string;
  aspectRatio: string;
  marginTop?: string;
}

export type InstagramPostProps = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  timestamp: Date;
  caption?: string;
};
