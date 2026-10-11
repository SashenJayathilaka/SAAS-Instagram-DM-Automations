import {
  createAutomations,
  deleteKeywords,
  saveKeywords,
  saveListener,
  savePosts,
  saveTrigger,
  updateAutomationName,
} from "@/actions/automation";
import { TRIGGER } from "@/redux/slices/automation";
import { AppDispatch, useAppSelector } from "@/redux/store";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { z } from "zod";
import { useMutationData } from "./use-mutation-data";
import useZodForm from "./use-zod-form";

export const useCreateAutomation = (id?: string) => {
  const { isPending, mutate } = useMutationData(
    ["create-automation"],
    () => createAutomations(id),
    "user-automation"
  );

  return { isPending, mutate };
};

export const useEditAutomation = (automationId: string) => {
  const [edit, setEdit] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const enableEdit = () => setEdit(true);
  const disableEdit = () => setEdit(false);

  const { isPending, mutate } = useMutationData(
    ["update-automation"],
    (data: { name: string }) =>
      updateAutomationName(automationId, { name: data.name }),
    "automation-info",
    disableEdit
  );

  useEffect(() => {
    function handleClickOutside(this: Document, event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node | null)
      ) {
        if (inputRef.current.value !== "") {
          mutate({ name: inputRef.current.value });
        } else {
          disableEdit();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mutate]);

  return { edit, enableEdit, disableEdit, inputRef, isPending };
};

export const useListener = (id: string) => {
  const [listener, setListener] = useState<"MESSAGE" | "SMARTAI" | null>(null);

  const promptSchema = z.object({
    prompt: z.string().min(1),
    reply: z.string(),
  });

  const { isPending, mutate } = useMutationData(
    ["create-listener"],
    (data: { prompt: string; reply: string }) =>
      saveListener(id, listener || "MESSAGE", data.prompt, data.reply),
    "automation-info"
  );

  const { onFormSubmit, register, errors, watch, reset } = useZodForm(
    promptSchema,
    mutate
  );

  const onSetListener = (listener: "MESSAGE" | "SMARTAI") => {
    setListener(listener);
    reset();
  };

  return { onSetListener, onFormSubmit, register, isPending, listener };
};

export const useTrigger = (id: string) => {
  const types = useAppSelector(
    (state) => state.AutomationReducer.trigger?.types
  );

  const dispatch: AppDispatch = useDispatch();

  const onSetTrigger = (type: "COMMENT" | "DM") => {
    dispatch(TRIGGER({ trigger: { type } }));
  };

  const { isPending, mutate } = useMutationData(
    ["add-trigger"],
    (data: { types: string[] }) => saveTrigger(id, data.types),
    "automation-info"
  );

  const onSaveTrigger = () => mutate({ types });

  return { types, onSetTrigger, onSaveTrigger, isPending };
};

export const useKeywords = (id: string) => {
  const [keywords, setKeywords] = useState("");

  const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setKeywords(e.target.value);

  const { mutate } = useMutationData(
    ["add-keywords"],
    (data: { keywords: string }) => saveKeywords(id, data.keywords),
    "automation-info",
    () => setKeywords("")
  );

  const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      mutate({ keywords });
      setKeywords("");
    }
  };

  const { mutate: deleteMutation } = useMutationData(
    ["delete-keywords"],
    (data: { id: string }) => deleteKeywords(data.id),
    "automation-info",
    () => setKeywords("")
  );

  return { keywords, onValueChange, onKeyPress, deleteMutation };
};

export const useAutomationPosts = (id: string) => {
  const [posts, setPosts] = useState<
    {
      postid: string;
      caption?: string;
      media: string;
      mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
    }[]
  >([]);

  const onSelectPost = (post: {
    postid: string;
    caption?: string;
    media: string;
    mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  }) => {
    setPosts((prev) => {
      if (prev.find((p) => p.postid === post.postid)) {
        return prev.filter((p) => p.postid !== post.postid);
      } else {
        return [...prev, post];
      }
    });
  };

  const { isPending, mutate } = useMutationData(
    ["attach-posts"],
    () => savePosts(id, posts),
    "automation-info",
    () => setPosts([])
  );
  return { onSelectPost, isPending, mutate, posts };
};
