import fetch from "cross-fetch";
import { ResponseError } from "error";

export interface ExternalLoaderInterface {
  setOptions(options: ExternalLoaderOptions): void;
  executeRequest(
    params: ExternalLoaderParams,
    callback: ResponseCallback,
    headers?: ExternalLoaderHeaders,
    errorCallback?: ErrorCallback
  ): void;
}

export interface ExternalLoaderOptions {
  readonly protocol: string;
  readonly host?: string;
  readonly pathname?: string;
}

export interface ExternalLoaderParams {
  [param: string]: string | undefined;
  JSONPCallback?: string;
}

export interface ExternalLoaderHeaders {
  [header: string]: string | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResponseCallback = (response: any) => void;
export type ErrorCallback = (responseError: ResponseError) => void;

const defaultOptions: ExternalLoaderOptions = {
  protocol: "http",
};

/**
 * Load data from external geocoding engines.
 */
export default class ExternalLoader implements ExternalLoaderInterface {
  private options: ExternalLoaderOptions = defaultOptions;

  public constructor(options: ExternalLoaderOptions = defaultOptions) {
    this.setOptions(options);
  }

  public setOptions(options: ExternalLoaderOptions): void {
    this.options = { ...defaultOptions, ...options };
  }

  public executeRequest(
    params: ExternalLoaderParams,
    callback: ResponseCallback,
    externalLoaderHeaders?: ExternalLoaderHeaders,
    errorCallback?: ErrorCallback
  ): void {
    if (!this.options.host) {
      throw new Error("A host is required for the external loader.");
    }
    if (!this.options.pathname) {
      throw new Error("A pathname is required for the external loader.");
    }

    const requestUrl = new URL(
      `${this.options.protocol}://${this.options.host}/${this.options.pathname}`
    );

    const { JSONPCallback: jsonpCallback, ...requestParams } = params;

    const filteredRequestParams = ExternalLoader.filterUndefinedObjectValues(
      requestParams
    );
    Object.keys(filteredRequestParams).forEach((paramKey) =>
      requestUrl.searchParams.append(
        paramKey,
        filteredRequestParams[paramKey] ?? ""
      )
    );

    if (jsonpCallback) {
      ExternalLoader.runJsonpCallback(requestUrl, callback, jsonpCallback);
      return;
    }

    const headers = ExternalLoader.filterUndefinedObjectValues(
      externalLoaderHeaders || {}
    );
    fetch(requestUrl.toString(), {
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new ResponseError(
            `Received HTTP status code ${response.status} when attempting geocoding request.`,
            response
          );
        }
        return response.json();
      })
      .then((data) => callback(data))
      .catch((error) => {
        if (errorCallback && error instanceof ResponseError) {
          errorCallback(error);
          return;
        }
        throw error;
      });
  }

  private static filterUndefinedObjectValues(
    object: Record<string, string | undefined>
  ): Record<string, string> {
    return Object.keys(object).reduce((acc: Record<string, string>, key) => {
      const filtered = acc;
      const value = object[key];
      if (value !== undefined) {
        filtered[key] = value;
      }
      return filtered;
    }, {});
  }

  private static runJsonpCallback(
    requestUrl: URL,
    callback: ResponseCallback,
    jsonpCallback: string
  ): void {
    if (typeof window === "undefined") {
      console.error(
        "JSONPCallback parameter can only be used in a browser environment."
      );

      return;
    }

    requestUrl.searchParams.append(
      jsonpCallback,
      ExternalLoader.generateJsonpCallback(callback)
    );

    // Create a new script element.
    const scriptElement = document.createElement("script");

    // Set its source to the JSONP API.
    scriptElement.src = requestUrl.toString();

    // Stick the script element in the page <head>.
    document.getElementsByTagName("head")[0].appendChild(scriptElement);
  }

  /**
   * Generates randomly-named function to use as a callback for JSONP requests.
   * @see https://github.com/OscarGodson/JSONP
   */
  private static generateJsonpCallback(callback: ResponseCallback): string {
    // Use timestamp + a random factor to account for a lot of requests in a short time.
    // e.g. jsonp1394571775161.
    const timestamp = Date.now();
    const generatedFunction = `jsonp${Math.round(
      timestamp + Math.random() * 1000001
    )}`;

    // Generate the temp JSONP function using the name above.
    // First, call the function the user defined in the callback param [callback(json)].
    // Then delete the generated function from the window [delete window[generatedFunction]].
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<any>window)[generatedFunction] = (json: string) => {
      callback(json);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (<any>window)[generatedFunction];
    };

    return generatedFunction;
  }
}
