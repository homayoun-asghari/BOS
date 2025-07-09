import * as React from "react"
import type { Editor } from "@tiptap/react"
import type { toggleVariants } from "@/components/ui/toggle"
import type { VariantProps } from "class-variance-authority"
import { ChevronDown, Check, Highlighter } from "lucide-react"
import { ToolbarButton } from "../toolbar-button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "../../hooks/use-theme"

interface ColorItem {
  cssVar: string
  label: string
  darkLabel?: string
}

interface ColorPalette {
  label: string
  colors: ColorItem[]
  inverse: string
}

const COLORS: ColorPalette[] = [
  {
    label: "Palette 1",
    inverse: "hsl(var(--background))",
    colors: [
      { cssVar: "hsl(var(--foreground))", label: "Default" },
      { cssVar: "var(--mt-accent-bold-blue)", label: "Bold blue" },
      { cssVar: "var(--mt-accent-bold-teal)", label: "Bold teal" },
      { cssVar: "var(--mt-accent-bold-green)", label: "Bold green" },
      { cssVar: "var(--mt-accent-bold-orange)", label: "Bold orange" },
      { cssVar: "var(--mt-accent-bold-red)", label: "Bold red" },
      { cssVar: "var(--mt-accent-bold-purple)", label: "Bold purple" },
    ],
  },
  {
    label: "Palette 2",
    inverse: "hsl(var(--background))",
    colors: [
      { cssVar: "var(--mt-accent-gray)", label: "Gray" },
      { cssVar: "var(--mt-accent-blue)", label: "Blue" },
      { cssVar: "var(--mt-accent-teal)", label: "Teal" },
      { cssVar: "var(--mt-accent-green)", label: "Green" },
      { cssVar: "var(--mt-accent-orange)", label: "Orange" },
      { cssVar: "var(--mt-accent-red)", label: "Red" },
      { cssVar: "var(--mt-accent-purple)", label: "Purple" },
    ],
  },
  {
    label: "Subtle Colors",
    inverse: "hsl(var(--foreground))",
    colors: [
      { cssVar: "var(--mt-accent-blue-subtler)", label: "Blue subtle" },
      { cssVar: "var(--mt-accent-teal-subtler)", label: "Teal subtle" },
      { cssVar: "var(--mt-accent-green-subtler)", label: "Green subtle" },
      { cssVar: "var(--mt-accent-yellow-subtler)", label: "Yellow subtle" },
      { cssVar: "var(--mt-accent-red-subtler)", label: "Red subtle" },
      { cssVar: "var(--mt-accent-purple-subtler)", label: "Purple subtle" },
    ],
  },
]

const MemoizedColorButton = React.memo<{
  color: ColorItem
  isSelected: boolean
  inverse: string
  onClick: (value: string) => void
}>(({ color, isSelected, inverse, onClick }) => {
  const isDarkMode = useTheme()
  const label = isDarkMode && color.darkLabel ? color.darkLabel : color.label

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem
          tabIndex={0}
          className="relative size-7 rounded-md p-0"
          value={color.cssVar}
          aria-label={label}
          style={{ backgroundColor: color.cssVar }}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault()
            e.stopPropagation()
            onClick(color.cssVar)
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isSelected && (
            <Check
              className="absolute inset-0 m-auto size-6"
              style={{ color: inverse }}
            />
          )}
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
})

MemoizedColorButton.displayName = "MemoizedColorButton"

const MemoizedColorPicker = React.memo<{
  palette: ColorPalette
  selectedColor: string
  inverse: string
  onColorChange: (value: string) => void
}>(({ palette, selectedColor, inverse, onColorChange }) => (
  <ToggleGroup
    type="single"
    value={selectedColor}
    onValueChange={(value: string) => {
      if (value) onColorChange(value)
    }}
    className="gap-1.5"
  >
    {palette.colors.map((color, index) => (
      <MemoizedColorButton
        key={index}
        inverse={inverse}
        color={color}
        isSelected={selectedColor === color.cssVar}
        onClick={onColorChange}
      />
    ))}
  </ToggleGroup>
))

MemoizedColorPicker.displayName = "MemoizedColorPicker"

interface SectionThreeProps extends VariantProps<typeof toggleVariants> {
  editor: Editor
}

export const SectionThree: React.FC<SectionThreeProps> = ({
  editor,
  size,
  variant,
}) => {
  const currentHighlight = editor.getAttributes('textStyle')?.backgroundColor || null;
  
  const handleColorSelect = React.useCallback(
    (color: string) => {
      // If clicking the same color, remove the highlight
      if (color === currentHighlight || 
          color === "hsl(var(--foreground))" || 
          color === "hsl(var(--background))" || 
          !color) {
        editor.chain().focus().unsetHighlight().run();
      } else {
        // Otherwise, set the new highlight color
        editor.chain().focus().setHighlight(color).run();
      }
    },
    [editor, currentHighlight]
  )

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <ToolbarButton
          tooltip="Highlight"
          aria-label="Highlight"
          className="w-12"
          size={size}
          variant={variant}
        >
          <Highlighter className="size-5" />
          <ChevronDown className="size-5" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-full">
        <div className="space-y-1.5">
          {COLORS.map((palette, index) => (
            <MemoizedColorPicker
              key={index}
              palette={palette}
              inverse={palette.inverse}
              selectedColor={currentHighlight}
              onColorChange={handleColorSelect}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

SectionThree.displayName = "SectionThree"

export default SectionThree
