import { useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import store from "immerhin";
import {
  type OnChangeChildren,
  type Data,
  type Tree,
  type Breakpoint,
  useAllUserProps,
  WrapperComponent,
  globalStyles,
  setBreakpoints,
  Project,
} from "@webstudio-is/sdk";
import { useSubscribe } from "./shared/pubsub";
import {
  createElementsTree,
  setInstanceChildrenMutable,
} from "~/shared/tree-utils";
import { useDragDropHandlers } from "./shared/use-drag-drop-handlers";
import { useShortcuts } from "./shared/use-shortcuts";
import {
  usePopulateRootInstance,
  useInsertInstance,
  useDeleteInstance,
  useReparentInstance,
} from "./shared/tree";
import { useUpdateStyle } from "./shared/style";
import {
  usePublishSelectedInstance,
  usePublishRootInstance,
  usePublishBreakpoints,
} from "./shared/publish";
import { useActiveElementTracking } from "./shared/active-element";
import { WrapperComponentDev } from "./features/wrapper-component";
import {
  rootInstanceContainer,
  useRootInstance,
  useBreakpoints,
} from "./shared/nano-values";
import { useSync } from "./shared/sync";
import { useManageProps } from "./shared/props";

const useElementsTree = () => {
  const [rootInstance] = useRootInstance();
  const [breakpoints] = useBreakpoints();

  return useMemo(() => {
    if (rootInstance === undefined) return;

    const onChangeChildren: OnChangeChildren = (change) => {
      store.createTransaction([rootInstanceContainer], (rootInstance) => {
        if (rootInstance === undefined) return;

        const { instanceId, updates } = change;
        setInstanceChildrenMutable(instanceId, updates, rootInstance);
      });
    };

    return createElementsTree({
      instance: rootInstance,
      breakpoints,
      Component: WrapperComponentDev,
      onChangeChildren,
    });
  }, [rootInstance, breakpoints]);
};

const useSubscribePreviewMode = () => {
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  useSubscribe<"previewMode", boolean>("previewMode", setIsPreviewMode);
  return isPreviewMode;
};

const useUpdateBreakpoints = (breakpoints: Array<Breakpoint>) => {
  const [, setCurrentBreakpoints] = useBreakpoints();
  setBreakpoints(breakpoints);
  setCurrentBreakpoints(breakpoints);
};

const PreviewMode = () => {
  const [rootInstance] = useRootInstance();
  const [breakpoints] = useBreakpoints();
  if (rootInstance === undefined) return null;
  return createElementsTree({
    breakpoints,
    instance: rootInstance,
    Component: WrapperComponent,
  });
};

type DesignModeProps = {
  treeId: Tree["id"];
  project: Project;
};

const DesignMode = ({ treeId, project }: DesignModeProps) => {
  useDragDropHandlers();
  useUpdateStyle();
  useManageProps();
  usePublishSelectedInstance({ treeId });
  usePublishBreakpoints();
  useInsertInstance();
  useReparentInstance();
  useDeleteInstance();
  usePublishRootInstance();
  useActiveElementTracking();
  useSync({ project });
  const elements = useElementsTree();
  return (
    // Using touch backend becuase html5 drag&drop doesn't fire drag events in our case
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      {elements}
    </DndProvider>
  );
};

type CanvasProps = {
  data: Data & { project: Project };
};

export const Canvas = ({ data }: CanvasProps): JSX.Element | null => {
  useUpdateBreakpoints(data.breakpoints);
  globalStyles();
  useAllUserProps(data.props);
  usePopulateRootInstance(data.tree);
  // e.g. toggling preview is still needed in both modes
  useShortcuts();
  const isPreviewMode = useSubscribePreviewMode();

  if (isPreviewMode) {
    return <PreviewMode />;
  }

  return <DesignMode treeId={data.tree.id} project={data.project} />;
};
