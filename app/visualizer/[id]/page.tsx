"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

import { generate3DView } from "@/lib/ai.action";
import {
  createProject,
  getProjectById,
} from "@/lib/puter.action";

import { useAuth } from "@/context/AuthProvider";

import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import Button from "@/components/ui/Button";

import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

export default function VisualizerPage({
  params,
}: {
  params: Promise<{ id: string }>;

}) {
 const { id } = use(params);


  const router = useRouter();
  const { userId } = useAuth();

  const hasInitialGenerated = useRef(false);

  const [project, setProject] = useState<DesignItem | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] =
    useState<string | null>(null);

  const handleBack = () => router.push("/");

  const handleExport = () => {
    if (!currentImage) return;

    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `CasaVisio-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runGeneration = async (item: DesignItem) => {
    if (!id || !item.sourceImage) return;

    try {
      setIsProcessing(true);

      const result = await generate3DView({
        sourceImage: item.sourceImage,
      });

      if (result.renderedImage) {
        setCurrentImage(result.renderedImage);

        const updatedItem = {
          ...item,
          renderedImage: result.renderedImage,
          renderedPath: result.renderedPath,
          timestamp: Date.now(),
          ownerId: item.ownerId ?? userId ?? null,
          isPublic: item.isPublic ?? false,
        };

        const saved = await createProject({
          item: updatedItem,
          visibility: "private",
        });

        if (saved) {
          setProject(saved);
          setCurrentImage(saved.renderedImage || null);
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Load project
  useEffect(() => {
    let isMounted = true;

    const loadProject = async () => {
      if (!id) return;

      setIsProjectLoading(true);

      const fetchedProject = await getProjectById({ id });

      if (!isMounted) return;

      setProject(fetchedProject);
      setCurrentImage(fetchedProject?.renderedImage || null);
      setIsProjectLoading(false);
      hasInitialGenerated.current = false;
    };

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // ✅ Auto generation logic
  useEffect(() => {
    if (
      isProjectLoading ||
      hasInitialGenerated.current ||
      !project?.sourceImage
    )
      return;

    if (project.renderedImage) {
      setCurrentImage(project.renderedImage);
      hasInitialGenerated.current = true;
      return;
    }

    hasInitialGenerated.current = true;
    void runGeneration(project);
  }, [project, isProjectLoading]);

  return (
    <div className="visualizer">
      <nav className="topbar">
        <div className="brand">
          <Box className="logo" />
          <span className="name">CasaVisio</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="exit"
        >
          <X className="icon" /> Exit Editor
        </Button>
      </nav>

      <section className="content">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Project</p>
              <h2>{project?.name || `Residence ${id}`}</h2>
              <p className="note">Created by You</p>
            </div>

            <div className="panel-actions">
              <Button
                size="sm"
                onClick={handleExport}
                disabled={!currentImage}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <div
            className={`render-area ${
              isProcessing ? "is-processing" : ""
            }`}
          >
            {currentImage ? (
              <img src={currentImage} className="render-img" />
            ) : (
              <div className="render-placeholder">
                {project?.sourceImage && (
                  <img
                    src={project.sourceImage}
                    className="render-fallback"
                  />
                )}
              </div>
            )}

            {isProcessing && (
              <div className="render-overlay">
                <div className="rendering-card">
                  <RefreshCcw className="spinner" />
                  <span>Rendering...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel compare">
          <div className="compare-stage">
            {project?.sourceImage && currentImage ? (
              <ReactCompareSlider
                defaultValue={50}
                itemOne={
                  <ReactCompareSliderImage
                    src={project.sourceImage}
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={currentImage}
                  />
                }
              />
            ) : (
              project?.sourceImage && (
                <img src={project.sourceImage} />
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
