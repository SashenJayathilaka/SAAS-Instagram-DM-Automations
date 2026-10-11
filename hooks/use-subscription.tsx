import axios from "axios";
import { useState } from "react";

type StripePlan = "creator" | "agency";

export const useSubscription = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const onSubscription = async (plan: StripePlan = "creator") => {
    setIsProcessing(true);
    const response = await axios.get(`/api/payment?plan=${plan}`);
    if (response.data.status === 200) {
      return (window.location.href = `${response.data.session_url}`);
    }

    setIsProcessing(false);
  };

  return { isProcessing, onSubscription };
};
