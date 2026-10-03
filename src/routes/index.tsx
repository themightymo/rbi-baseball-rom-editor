import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RomProvider, useRom } from "@/lib/romStore";
import { RomDropZone, RomToolbar } from "@/components/RomUploader";
import { RbiDetectionPanel } from "@/components/RbiDetectionPanel";
import { ExportPanel } from "@/components/ExportPanel";
import { RbiRosterPanel } from "@/components/RbiRosterPanel";
import { RbiAdvancedRosterEditor } from "@/components/RbiAdvancedRosterEditor";
import { InspectRomTools, CustomLayoutTools } from "@/components/AdvancedTools";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileSearch, List, Save, Table, Users } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return (
    <RomProvider>
      <Shell />
    </RomProvider>
  );
}

function Shell() {
  const { rom } = useRom();
  const [tab, setTab] = useState("rosters");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="nes-rule bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground">NES ROM EDITOR</p>
          <h1 className="mt-2 text-lg leading-relaxed text-foreground">
            R.B.I. Baseball ROM Editor
          </h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-4 py-6">
        {!rom ? (
          <div className="py-8">
            <RomDropZone />
          </div>
        ) : (
          <>
            <RomToolbar />
            <RbiDetectionPanel />
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start">
                <TabsTrigger value="rosters" className="gap-1.5">
                  <Users className="size-4" /> RBI Rosters
                </TabsTrigger>
                <TabsTrigger value="inspect" className="gap-1.5">
                  <FileSearch className="size-4" /> Inspect ROM
                </TabsTrigger>
                <TabsTrigger value="advanced-rosters" className="gap-1.5">
                  <List className="size-4" /> Advanced Rosters
                </TabsTrigger>
                <TabsTrigger value="layouts" className="gap-1.5">
                  <Table className="size-4" /> Research Layouts
                </TabsTrigger>
                <TabsTrigger value="save" className="ml-auto gap-1.5">
                  <Save className="size-4" /> Save &amp; Export
                </TabsTrigger>
              </TabsList>
              <TabsContent value="inspect">
                <InspectRomTools />
              </TabsContent>
              <TabsContent value="advanced-rosters">
                <RbiAdvancedRosterEditor />
              </TabsContent>
              <TabsContent value="layouts">
                <CustomLayoutTools />
              </TabsContent>
              <TabsContent value="rosters">
                <RbiRosterPanel />
              </TabsContent>
              <TabsContent value="save">
                <ExportPanel />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <footer className="border-t-[3px] border-[#fc74b4] bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        <Popover>
          <PopoverTrigger className="underline-offset-4 hover:text-foreground hover:underline">
            About
          </PopoverTrigger>
          <PopoverContent side="top" className="text-xs leading-relaxed text-muted-foreground">
            This tool contains no ROM or game data. Supply a legally obtained ROM. All ROM
            processing stays in your browser.
          </PopoverContent>
        </Popover>
      </footer>
    </div>
  );
}
