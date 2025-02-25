import {
  Brain,
  LineChart,
  Layers,
  Sunrise,
  LucideIcon,
  LucideProps
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Brain,
  LineChart,
  Layers,
  Sunrise
};

interface IconProps extends LucideProps {
  name: keyof typeof iconMap;
}

export default function Icon({ name, ...props }: IconProps) {
  const IconComponent = iconMap[name];
  return <IconComponent {...props} />;
}
