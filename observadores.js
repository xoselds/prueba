//funcion para observar cambios en el DOM
function observeChanges(selector, options = {}, callback, timeout = 18000) {
    let cancelled = false;

    function startObserver(el) {
        if (cancelled) return null;

        // Siempre observar class y style
        const attributeFilter = Array.from(new Set([
            ...(options.attributes || []),
            "class",
            "style"
        ]));

        const config = {
            attributes: true,
            attributeFilter: attributeFilter,
            characterData: !!options.textContent || !!options.innerHTML,
            // childList: !!options.innerHTML,
            // subtree: !!options.subtree || !!options.textContent || !!options.innerHTML
            childList:true, //SIEMPRE
            subtree: true, //SIEMPRE
        };

        const obs = new MutationObserver(mutations => {
            mutations.forEach(m => {
                // Cambios en atributos (siempre incluye class/style)
                if (m.type === "attributes") {
                    callback({
                        type: "attribute",
                        name: m.attributeName,
                        value: el.getAttribute(m.attributeName),
                        element: el,
                        mutation: m
                    });
                }

                // Cambio en texto
                if (m.type === "characterData" && options.textContent) {
                    callback({
                        type: "text",
                        value: m.target.data,
                        element: m.target.parentElement,
                        mutation: m
                    });
                }

                // Cambio en innerHTML
                if (m.type === "childList" && options.innerHTML) {
                    callback({
                        type: "innerHTML",
                        html: el.innerHTML,
                        element: el,
                        mutation: m
                    });
                }
            });
        });

        obs.observe(el, config);
        return obs;
    }

    // 1️ si el elemento ya existe
    let el = document.querySelector(selector);
    if (el) {
        return {
            observer: startObserver(el),
            cancel: () => { cancelled = true; }
        };
    }

    // 2️ esperar a que aparezca el elemento SIEMPRE
    const waitObserver = new MutationObserver(() => {
        el = document.querySelector(selector);
        if (el) {
            waitObserver.disconnect();
            startObserver(el);
        }
    });

    waitObserver.observe(document.body, { childList: true, subtree: true });

    // 3️ timeout opcional
    const timer = setTimeout(() => {
        if (!cancelled) {
            waitObserver.disconnect();
            //console.warn(`observeChanges: elemento no encontrado → ${selector}`);
        }
    }, timeout);

    return {
        observer: waitObserver,
        cancel: () => {
            cancelled = true;
            clearTimeout(timer);
            waitObserver.disconnect();
        }
    };
}


// const watcher = observeChanges(".popup", { attributes: ["class", "style"] }, info => {
//   console.log("Cambio:", info);
// }, 5000);
//cancelacion manual watcher.cancel();

//funcion para cambios en JS **** tanto objetos como arrais

function observeObject(obj, callback) {
  const proxified = new WeakMap();

  function createProxy(target, path = []) {
    if (proxified.has(target)) return proxified.get(target);

    const proxy = new Proxy(target, {
      get(t, prop, rec) {
        const value = Reflect.get(t, prop, rec);

        // Cuando el valor es un objeto → crear Proxy recursivo
        if (value && typeof value === "object") {
          return createProxy(value, path.concat(prop));
        }

        return value;
      },

      set(t, prop, value, rec) {
        const oldValue = t[prop];
        const ok = Reflect.set(t, prop, value, rec);

        if (ok && oldValue !== value) {
          callback({
            type: "set",
            path,
            prop,
            oldValue,
            newValue: value,
            //target: t
          });
        }
        return ok;
      },

      deleteProperty(t, prop) {
        const oldValue = t[prop];
        const ok = Reflect.deleteProperty(t, prop);

        if (ok) {
          callback({
            type: "delete",
            path,
            prop,
            oldValue,
            newValue: undefined,
            //target: t
          });
        }

        return ok;
      }
    });

    proxified.set(target, proxy);
    return proxy;
  }

  return createProxy(obj, []);
}




// let miStore = {
//   name: "Juan",
//   age: 25
// };
// //sobreescribir
// miStore = observeObject(miStore, info => {
//   console.log("CAMBIO:", info ,'objeto:', miStore);
// });


// let miArray = [10, 20, 30];
// miArray = observeObject(miArray, info => {
//   console.log("CAMBIO ARRAY:", info, 'array:', miArray);
// });
