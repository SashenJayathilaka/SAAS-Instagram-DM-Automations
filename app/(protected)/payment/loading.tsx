import { UiText } from "@/components/i18n/localized-copy";
import Loader from "@/components/global/loader";

type Props = {};

function Loading({}: Props) {
  return (
    <div className="h-screen flex justify-center items-center">
      <Loader state><UiText>{"...Loading"}</UiText></Loader>
    </div>
  );
}

export default Loading;
