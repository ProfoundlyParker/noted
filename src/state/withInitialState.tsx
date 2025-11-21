import { Page } from "../utils/types";
import { useMatch } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import startPageScaffold from "./startPageScaffold.json";
import styles from "../utils.module.css";
import { Loader } from "../components/Loader";
import { ErrorMessage } from "../Page/ErrorMessage";

type InjectedProps = {
  initialState: Page;
};

type PropsWithoutInjected<TBaseProps> = Omit<TBaseProps, keyof InjectedProps>;

export function withInitialState<TProps>(
  WrappedComponent: React.ComponentType<
    PropsWithoutInjected<TProps> & InjectedProps
  >
) {
  return (props: PropsWithoutInjected<TProps>) => {
    const match = useMatch("/:slug");
    const pageSlug = match ? match.params.slug : "start";

    const [initialState, setInitialState] = useState<Page | null>();
    const [isLoading, setIsLoading] = useState(true);
    const [error, _setError] = useState<Error | undefined>();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const inProgress = useRef(false)

    useEffect(() => {
      if (inProgress.current) {
        /* c8 ignore next 2 */
        return
      }
      inProgress.current = true;
      setIsLoading(true);
      const fetchInitialState = async () => {
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData?.user?.id) throw new Error("Failed to fetch user info");

          const userId = userData.user.id;

          const { data, error } = await supabase
            .from("pages")
            .select("title, id, cover, nodes, slug")
            .match({ slug: pageSlug, created_by: userId })
            .limit(1);

          if (error) throw error;

          if (!data?.[0]) {
            const retryData: any = await supabase
                .from("pages")
                .select("*")
                .match({ slug: "start", created_by: userId })
                .limit(1);

            if (retryData?.[0]) {
                setInitialState(retryData[0]);
                setIsLoading(false);
                return;
          }
           if (pageSlug === "start") {
             const { data: existingStart } = await supabase
              .from("pages")
              .select("id")
              .match({ slug: "start", created_by: userId })
              .limit(1);

            if (!existingStart?.length) {
              const { error: insertError } = await supabase
                .from("pages")
                .insert({ ...startPageScaffold, slug: "start", created_by: userId });

              if (insertError) throw insertError;
            }

            const { data: startPage } = await supabase
              .from("pages")
              .select("title, id, cover, nodes, slug")
              .match({ slug: "start", created_by: userId })
              .limit(1);

            setInitialState(startPage?.[0]);
            inProgress.current = false;
            setIsLoading(false);
            return;
          } else {
            setErrorMessage("Page not found");
          }
        } catch (err: any) {
          console.error(err);
          setErrorMessage("Failed to load page data");
        } finally {
          inProgress.current = false;
          setIsLoading(false);
        }
      };
      fetchInitialState();
    }, [pageSlug]);

    if (isLoading) {
      return (
        <div className={styles.centeredFlex}>
          <Loader data-testid="loader" />
        </div>
      );
    }

    if (error) {
      /* c8 ignore next 2 */
      {errorMessage && <ErrorMessage message={errorMessage} onClose={() => setErrorMessage(null)} />}
    }

    if (!initialState) {
      return (
        <div className={styles.container}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/2748/2748558.png"
            alt="Lost page illustration"
            className={styles.image}
          />
          <h1 className={styles.notFoundTitle}>Oops! This page doesn’t exist.</h1>
          <p className={styles.subtitle}>
            You might have mistyped the URL, or this page has been torn from the notebook. 📔
          </p>
          <button
            className={styles.pageNotFoundButton}
            onClick={() => (window.location.href = '/')}
          >
            Return to Home
          </button>
        </div>
      );
    }

    return <WrappedComponent {...props} initialState={initialState} />;
  };
}