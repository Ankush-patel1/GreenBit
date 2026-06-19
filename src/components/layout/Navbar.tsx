import { Bell, Search, Leaf, Menu } from "lucide-react"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"

interface NavbarProps {
  onMenuToggle: () => void
  currentTab: string
}

export const Navbar = ({ onMenuToggle, currentTab }: NavbarProps) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-forest/10 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-1.5"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5 text-brand-forest" />
        </Button>

        {/* Tab / Route Title */}
        <div className="flex items-center space-x-2">
          <Leaf className="h-5 w-5 text-brand-leaf lg:hidden" />
          <h2 className="text-xl font-heading font-semibold text-brand-forest capitalize">
            {currentTab}
          </h2>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-4">
        {/* Search (Desktop only) */}
        <div className="hidden md:block w-64">
          <Input
            placeholder="Search activities..."
            leftIcon={<Search className="h-4 w-4" />}
            className="h-9 py-1"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative p-2 rounded-full hover:bg-brand-forest/5">
          <Bell className="h-5 w-5 text-brand-forest/75" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-amber rounded-full ring-2 ring-white" />
        </Button>

        {/* User profile */}
        <div className="flex items-center space-x-3 border-l border-brand-forest/15 pl-4">
          <div className="w-8 h-8 rounded-full bg-brand-leaf text-white font-heading font-bold text-sm flex items-center justify-center shadow-inner">
            JD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-brand-forest leading-tight">John Doe</p>
            <p className="text-[10px] text-brand-forest/55">Forest Guardian</p>
          </div>
        </div>
      </div>
    </header>
  )
}
