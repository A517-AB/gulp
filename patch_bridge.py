with open("src/shared/bridge.test.ts", "r") as f:
    content = f.read()

content = content.replace('''  if (windowValue) {
    Object.defineProperty(globalThis, "window", {
      value: windowValue,
      configurable: true,
      writable: true,
    });
  } else {
    clearWindow();
  }''', '''  if (windowValue) {
    Object.defineProperty(globalThis, "window", {
      value: windowValue,
      configurable: true,
      writable: true,
    });
    if ("electron" in windowValue) {
      Object.defineProperty(globalThis, "electron", {
        value: (windowValue as any).electron,
        configurable: true,
        writable: true,
      });
    }
  } else {
    clearWindow();
    Reflect.deleteProperty(globalThis, "electron");
  }''')

with open("src/shared/bridge.test.ts", "w") as f:
    f.write(content)
