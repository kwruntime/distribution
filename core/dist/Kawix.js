"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Kawix = exports.BinaryData = exports.Installer = exports.KModule = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _module = _interopRequireDefault(require("module"));

var _os = _interopRequireDefault(require("os"));

var _path = _interopRequireDefault(require("path"));

var _crypto = _interopRequireDefault(require("crypto"));

var _util = _interopRequireDefault(require("util"));

var _http = _interopRequireDefault(require("http"));

var _https = _interopRequireDefault(require("https"));

var _url = _interopRequireDefault(require("url"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Deferred {
  constructor() {
    this._promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  get promise() {
    return this._promise;
  }

}

class KModule {
  static addVirtualFile(path, filedata) {
    if (typeof filedata == "function") {
      filedata = filedata();
    }

    this.$files.set(_path.default.posix.join("/virtual", path), filedata);
  }

  static addExtensionLoader(ext, loader) {
    _module.default["_extensions"][ext] = function (module, filename) {
      let defaultPreload = function () {
        module._compile("exports.__kawix__compile = true; exports.__local__vars = { module, require, __dirname, __filename, global, Buffer }; exports.__filename = " + JSON.stringify(filename), filename);
      };

      if (loader.preload) {
        loader.preload(module, filename, defaultPreload);
      } else {
        defaultPreload();
      }
    };

    this.addExtensionLoader[ext] = loader;
    this.extensionCompilers[ext] = loader.compile;
  }

  constructor(module) {
    this.$module = module;
  }

  get extensions() {
    let item = {};

    for (let id in this.extensionCompilers) {
      item[id] = true;
    }

    return item;
  }

  get extensionCompilers() {
    return KModule.extensionCompilers;
  }

  get languages() {
    return KModule.languages;
  }
  /* backward */


  injectImport() {}

  injectImports() {}

  disableInjectImport() {}
  /* backward */


  getData(name) {
    return Kawix.getData(this.$module.__kawix__filename, name);
  }

  addVirtualFile() {
    return KModule.addVirtualFile.apply(KModule, arguments);
  }

  addExtensionLoader() {
    return KModule.addExtensionLoader.apply(KModule, arguments);
  }

  import(request, parent = null) {
    if (!parent) parent = this.$module;
    return global.kawix.import(request, parent);
  }

}

exports.KModule = KModule;

_defineProperty(KModule, "languages", {
  "json": ".json",
  "javascript": ".js",
  "ecmascript": ".js",
  "typescript": ".ts"
});

_defineProperty(KModule, "extensionCompilers", {});

_defineProperty(KModule, "extensionLoaders", {});

_defineProperty(KModule, "$files", new Map());

class Installer {
  constructor(kawix) {
    this.$kawix = kawix;
  }

  getBinFolder() {
    if (_os.default.platform() == "linux" || _os.default.platform() == "darwin" || _os.default.platform() == "android") {
      if (process.getuid() == 0) {
        return "/usr/KwRuntime/bin";
      } else {
        return _path.default.join(_os.default.homedir(), "KwRuntime", "bin");
      }
    }

    if (_os.default.platform() == "win32") {
      return _path.default.join(_os.default.homedir(), "KwRuntime", "bin");
    }
  }

  install(href, name, options) {
    if (href.endsWith(".kwt")) {}

    let exe = options.executable || "kwrun";

    if (_os.default.platform() == "linux" || _os.default.platform() == "darwin" || _os.default.platform() == "android") {
      let bin = this.getBinFolder();

      let cmd = _path.default.join(bin, exe);

      let out = _path.default.join(bin, name);

      _fs.default.writeFileSync(out, [`#!${cmd}`, `export {default} from ${JSON.stringify(href)}`, `export * from ${JSON.stringify(href)}`].join("\n"));

      _fs.default.chmodSync(out, "775");

      if (options.autostart !== undefined) {
        // start with computer 
        let folderAutoStart = _path.default.join(_os.default.homedir(), ".config", "autostart-scripts");

        if (!_fs.default.existsSync(folderAutoStart)) {
          _fs.default.mkdirSync(folderAutoStart);
        }

        _fs.default.symlinkSync(out, _path.default.join(folderAutoStart, name));
      }

      console.info("Installed!");
    } else if (_os.default.platform() == "win32") {
      let bin = this.getBinFolder();

      let cmd = _path.default.join(bin, exe);

      let out = _path.default.join(bin, name + ".cmd");

      _fs.default.writeFileSync(out, [`@echo off`, `"${cmd}" "${href}" %*`].join("\n"));

      if (options.autostart !== undefined) {// start with computer 
      }

      console.info("Installed!");
    }
  } // install in path


  async selfInstall() {
    if (_os.default.platform() == "linux" || _os.default.platform() == "darwin" || _os.default.platform() == "android") {
      await this.selfInstallUnix(); // DISABLE AUTO INSTALL OF KAWIX/CORE
      //await this.installKwcore()
    } else if (_os.default.platform() == "win32") {
      await this.selfInstallWin32(); // DISABLE AUTO INSTALL OF KAWIX/CORE
      //await this.installKwcore()
    } // install utils


    await this.installUtils();
  }

  setExtensions(options) {
    if (_os.default.platform() == "win32") {
      return this.setExtensionsWin32(options.type, options.description, options.extensions, options.terminal, options.appName);
    } else if (_os.default.platform() == "linux") {
      return this.setExtensionsLinux(options);
    }
  }

  async update() {
    let id = parseInt(String(Date.now() / (24 * 3600000))) + ".json";

    let platform = _os.default.platform();

    let arch = _os.default.arch();

    if (arch == "ia32") arch = "x86";
    let pkg = await this.$kawix.import("gh+/kwruntime/core/package.json?date=" + id);

    if (pkg.version != this.$kawix.version) {
      var _info$platform;

      let info = await this.$kawix.import("gh+/kwruntime/core/install.info.json?date=" + id);
      let files = (_info$platform = info[platform]) === null || _info$platform === void 0 ? void 0 : _info$platform.files;

      if (!files) {
        console.error(`> No hay una actualización disponible para su plataforma: ${platform}-${arch}`);
      }

      console.info("> Actualizando a una nueva versión:", pkg.version);
      files = files.filter(a => a.usage.indexOf("node") >= 0); // download files?
    } ///TODO

  }

  $linuxGuiPaths() {
    let paths = {};

    if (process.getuid() == 0) {
      paths.mainIcon = "/usr/share/icons";

      if (!_fs.default.existsSync(paths.mainIcon)) {
        _fs.default.mkdirSync(paths.mainIcon);
      }

      paths.icon = _path.default.join(paths.mainIcon, "hicolor");

      if (!_fs.default.existsSync(paths.icon)) {
        _fs.default.mkdirSync(paths.icon);
      }

      paths.icon = _path.default.join(paths.icon, "scalable");

      if (!_fs.default.existsSync(paths.icon)) {
        _fs.default.mkdirSync(paths.icon);
      }

      paths.icon = _path.default.join(paths.icon, "apps");

      if (!_fs.default.existsSync(paths.icon)) {
        _fs.default.mkdirSync(paths.icon);
      }

      paths.apps = "/usr/share/applications";
      paths.mime = "/usr/share/mime/packages";
      paths.mimeo = "/usr/share/mime";
    } else {
      let local = paths.mainIcon = _path.default.join(_os.default.homedir(), ".local");

      if (!_fs.default.existsSync(local)) {
        _fs.default.mkdirSync(local);
      }

      local = _path.default.join(local, "share");

      if (!_fs.default.existsSync(local)) {
        _fs.default.mkdirSync(local);
      }

      paths.mainIcon = _path.default.join(local, "icons");

      if (!_fs.default.existsSync(paths.mainIcon)) {
        _fs.default.mkdirSync(paths.mainIcon);
      }

      paths.icon = _path.default.join(paths.mainIcon, "hicolor");

      if (!_fs.default.existsSync(paths.icon)) {
        _fs.default.mkdirSync(paths.icon);
      }

      paths.icon = _path.default.join(paths.icon, "scalable");

      if (!_fs.default.existsSync(paths.icon)) {
        _fs.default.mkdirSync(paths.icon);
      }

      paths.icon = _path.default.join(paths.icon, "apps");

      if (!_fs.default.existsSync(paths.icon)) {
        _fs.default.mkdirSync(paths.icon);
      }

      paths.apps = _path.default.join(_os.default.homedir(), ".local/share/applications");
      paths.mime = _path.default.join(_os.default.homedir(), ".local/share/mime/packages");
      paths.mimeo = _path.default.join(_os.default.homedir(), ".local/share/mime");
    }

    if (!_fs.default.existsSync(paths.apps)) {
      _fs.default.mkdirSync(paths.apps);
    }

    if (!_fs.default.existsSync(paths.mimeo)) {
      _fs.default.mkdirSync(paths.mimeo);
    }

    if (!_fs.default.existsSync(paths.mime)) {
      _fs.default.mkdirSync(paths.mime);
    }

    return paths;
  }

  async $saveLinuxIcon() {
    let paths = this.$linuxGuiPaths();

    let iconPath = _path.default.join(paths.mainIcon, "kwruntimeapp.svg");

    let pngcpath = _path.default.join(paths.mainIcon, "kwruntimeapp.tar.gz");

    let siconPath = _path.default.join(paths.icon, "kwruntimeapp.svg");

    _fs.default.writeFileSync(iconPath, this.$kawix.svgIcon);

    _fs.default.writeFileSync(pngcpath, this.$kawix.pngCompressedIcons); // extract compressed icons 


    await new Promise(function (resolve, reject) {
      let p = require("child_process").spawn("tar", ["xvf", "kwruntimeapp.tar.gz"], {
        cwd: paths.mainIcon
      });

      p.on("error", reject);
      p.on("exit", resolve);
    });
    if (_fs.default.existsSync(siconPath)) _fs.default.unlinkSync(siconPath);
    await _fs.default.promises.symlink(iconPath, siconPath);
    let er = null;

    try {
      // this works on ubuntu
      await new Promise(function (resolve, reject) {
        let p = require("child_process").spawn("update-icon-caches", [paths.mainIcon, _path.default.join(paths.icon, "hicolor")]);

        p.on("error", reject);
        p.on("exit", resolve);
      });
    } catch (e) {
      er = e;
    }

    if (er) {
      try {
        // this works on opensuse and maybe others
        await new Promise(function (resolve, reject) {
          let p = require("child_process").spawn("gtk-update-icon-cache", [paths.mainIcon, _path.default.join(paths.icon, "hicolor")]);

          p.on("error", reject);
          p.on("exit", resolve);
        });
      } catch (e) {}
    }
  }

  $removeMimetypes(prefix) {
    if (prefix) {
      let paths = this.$linuxGuiPaths();

      let files = _fs.default.readdirSync(paths.mime);

      let filep = files.filter(a => a.startsWith(prefix));

      for (let file of filep) {
        try {
          _fs.default.unlinkSync(_path.default.join(paths.mime, file));
        } catch (e) {}
      }
    }
  }

  async $desktopFile(config) {
    let $paths = this.$runtimePaths();
    config.appName = config.appName || "kwrun";
    let appid = config.id || config.appName + "app";

    let kwruntime = _path.default.join($paths.bin, config.appName);

    let desktopContent = `[Desktop Entry]
Terminal=${Boolean(config.terminal)}
NoDisplay=${Boolean(config.nodisplay)}
Icon=kwruntimeapp
Type=Application
Categories=Application;Network;
Exec="${kwruntime}" %F
MimeType=${config.types.join(";")};
Name=${config.title}
Comment= `;
    let paths = this.$linuxGuiPaths();

    if (!_fs.default.existsSync(paths.apps)) {
      console.info("> Warning: Detected server installation. Omiting desktop files");
    } else {
      _fs.default.writeFileSync(_path.default.join(paths.apps, appid + ".desktop"), desktopContent);
      /*desktopContent = desktopContent.replace("Terminal=false", "Terminal=true")
      //desktopContent = desktopContent.replace("NoDisplay=true", "")
      Fs.writeFileSync(Path.join(paths.apps, appid + "-terminal.desktop"), desktopContent)*/


      try {
        // this works on ubuntu
        await new Promise(function (resolve, reject) {
          let p = require("child_process").spawn("update-desktop-database", [paths.apps]);

          p.on("error", reject);
          p.on("exit", resolve);
        });
      } catch (e) {}
    }
  }

  async setExtensionsLinux(config) {
    try {
      await this.$saveLinuxIcon();
    } catch (e) {
      console.info("Warning: Failed installing icon");
    }

    let $paths = this.$runtimePaths();
    config.appName = config.appName || "kwrun";
    let appid = config.id || config.appName + "app";

    let kwruntime = _path.default.join($paths.bin, config.appName);

    let paths = this.$linuxGuiPaths();
    let scon = ['<?xml version="1.0" encoding="UTF-8"?>', '<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">'];
    scon.push(`<mime-type type="${config.type}">`);
    scon.push(`<comment xml:lang="en">${config.description}</comment>`);

    for (let ext of config.extensions) {
      scon.push(`<glob pattern="*${ext}" />`);
    }

    scon.push(`<icon name="kwruntimeapp"/>`);
    scon.push("</mime-type>");
    scon.push("</mime-info>");

    if (!_fs.default.existsSync(paths.mime)) {
      console.info("> Warning: Detected server installation. Omiting mime files");
    } else {
      _fs.default.writeFileSync(_path.default.join(paths.mime, appid + "_mimes_" + config.type.replace("/", "") + ".xml"), scon.join("\n"));

      try {
        // this works on ubuntu
        await new Promise(function (resolve, reject) {
          let p = require("child_process").spawn("update-mime-database", [paths.mimeo]);

          p.on("error", reject);
          p.on("exit", resolve);
        });
      } catch (e) {}
    }
  }

  async setExtensionsWin32(type, description, extensions, terminal = true, appName = "") {
    let name = "com.kodhe.com-" + type.replace(/\//g, '-') + (terminal ? 'terminal' : '');
    let def = {
      resolve: null,
      reject: null,
      promise: null
    };
    def.promise = new Promise(function (a, b) {
      def.resolve = a;
      def.reject = b;
    });
    let extnames = [];

    for (let ext of extensions) {
      extnames.push(`HKCU\\SOFTWARE\\Classes\\${ext}`);
    }

    let WinReg = null;

    try {
      WinReg = require("winreg-vbs");
    } catch (e) {
      // read from npm
      WinReg = await this.$kawix.import("npm://winreg-vbs@1.0.0");
    }

    WinReg.createKey([...extnames, `HKCU\\SOFTWARE\\Classes\\${name}`, `HKCU\\SOFTWARE\\Classes\\${name}\\DefaultIcon`, `HKCU\\SOFTWARE\\Classes\\${name}\\Shell`, `HKCU\\SOFTWARE\\Classes\\${name}\\Shell\\open`, `HKCU\\SOFTWARE\\Classes\\${name}\\Shell\\open\\command`], function (err) {
      if (err) def.reject(err);
      def.resolve();
    });
    await def.promise;
    def = {
      resolve: null,
      reject: null,
      promise: null
    };
    def.promise = new Promise(function (a, b) {
      def.resolve = a;
      def.reject = b;
    });
    let param = {};

    for (let ext of extensions) {
      param[`HKCU\\SOFTWARE\\Classes\\${ext}`] = {
        'default': {
          value: name,
          type: 'REG_DEFAULT'
        },
        'Content Type': {
          value: type,
          type: 'REG_SZ'
        }
      };
    }

    let kwrun = '';

    if (appName) {
      kwrun = _os.default.homedir() + "\\KwRuntime\\bin\\" + appName + ".exe";
    } else {
      if (terminal) {
        kwrun = _os.default.homedir() + "\\KwRuntime\\bin\\kwrun.exe";
      } else {
        kwrun = _os.default.homedir() + "\\KwRuntime\\bin\\kwrun-gui.exe";
      }
    }

    let iconpath = kwrun;
    WinReg.putValue(Object.assign(param, {
      [`HKCU\\SOFTWARE\\Classes\\${name}`]: {
        'default': {
          value: description || `Archivo ${type}`,
          type: 'REG_DEFAULT'
        }
      },
      [`HKCU\\SOFTWARE\\Classes\\${name}\\Shell\\open\\command`]: {
        'default': {
          value: `"${kwrun}" "%1"`,
          type: 'REG_DEFAULT'
        }
      },
      [`HKCU\\SOFTWARE\\Classes\\${name}\\DefaultIcon`]: {
        'default': {
          value: `"${iconpath}",0`,
          type: 'REG_DEFAULT'
        }
      }
    }), function (err) {
      if (err) def.reject(err);
      def.resolve();
    });
    await def.promise;
  }

  async selfInstallWin32() {
    let kawixFolder = _path.default.join(_os.default.homedir(), "KwRuntime");

    if (!_fs.default.existsSync(kawixFolder)) _fs.default.mkdirSync(kawixFolder);

    let utils = _path.default.join(kawixFolder, "utils");

    if (!_fs.default.existsSync(utils)) _fs.default.mkdirSync(utils);

    let bin = _path.default.join(kawixFolder, "bin");

    if (!_fs.default.existsSync(bin)) _fs.default.mkdirSync(bin);

    let runtimeFolder = _path.default.join(kawixFolder, "runtime");

    if (!_fs.default.existsSync(runtimeFolder)) _fs.default.mkdirSync(runtimeFolder);

    if (process.env.PATH.indexOf(bin) < 0) {
      // setx path
      let child = require("child_process");

      child.execSync(`setx path "${bin};${utils};%path%"`);
    }

    let defaultExes = {
      term: _path.default.join(runtimeFolder, "default_executable.dll"),
      gui: _path.default.join(runtimeFolder, "default_gui_executable.dll")
    };

    if (!_fs.default.existsSync(defaultExes.term)) {
      defaultExes.term = _path.default.join(runtimeFolder, "default_executable.code");
    }

    if (!_fs.default.existsSync(defaultExes.gui)) {
      defaultExes.gui = _path.default.join(runtimeFolder, "default_gui_executable.code");
    }

    if (!_fs.default.existsSync(defaultExes.term)) delete defaultExes.term;
    if (!_fs.default.existsSync(defaultExes.gui)) delete defaultExes.gui;

    let writeCmd = function (file, text) {
      _fs.default.writeFileSync(file, text);

      if (defaultExes.term) {
        let nfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + ".exe");

        let cfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + ".exe.config");

        try {
          _fs.default.writeFileSync(nfile, _fs.default.readFileSync(defaultExes.term));

          _fs.default.writeFileSync(cfile, `<configuration>
<startup>
	<supportedRuntime version="v4.0"/>
	<supportedRuntime version="v2.0.50727"/>
</startup>
</configuration>
				  `);
        } catch (e) {
          console.error("[WARNING] Failed writing executable wrapper:", nfile);
        }
      }

      if (defaultExes.gui) {
        let nfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + "-gui.exe");

        let cfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + "-gui.exe.config");

        try {
          _fs.default.writeFileSync(nfile, _fs.default.readFileSync(defaultExes.gui));

          _fs.default.writeFileSync(cfile, `<configuration>
<startup>
	<supportedRuntime version="v4.0"/>
	<supportedRuntime version="v2.0.50727"/>
</startup>
</configuration>
				  `);
        } catch (e) {
          console.error("[WARNING] Failed writing executable wrapper:", nfile);
        }
      }
    };

    let exe = this.$kawix.executable;
    let nodev = process.version.split(".")[0].substring(1);
    let content = `@echo off\r\nset NODE_SKIP_PLATFORM_CHECK=1\r\n"${exe.cmd}" "${exe.args.join('" "')}" %*`;

    let binFile = _path.default.join(bin, "kwrun-n" + nodev + ".cmd");

    _fs.default.writeFileSync(binFile, content);

    content = `@echo off\r\n"${process.execPath}" %*`;
    binFile = _path.default.join(bin, "node-n" + nodev + ".cmd");

    _fs.default.writeFileSync(binFile, content);

    content = `@echo off\r\nset NODE_SKIP_PLATFORM_CHECK=1\r\n"${exe.cmd}" --insecure-http-parser "${exe.args.join('" "')}" %*`;
    binFile = _path.default.join(bin, "kwrun-legacy-n" + nodev + ".cmd");

    _fs.default.writeFileSync(binFile, content);

    let files = _fs.default.readdirSync(bin);

    let fileinfo = files.filter(a => a.startsWith("kwrun-") && a.endsWith(".cmd")).map(a => ({
      name: a,
      v: a.split("-").slice(-1)[0].split(".")[0].substring(1)
    }));
    fileinfo.sort((a, b) => Number(a.v) - Number(b.v));

    if (fileinfo.length) {
      let v = fileinfo[fileinfo.length - 1].v;
      writeCmd(_path.default.join(bin, "kwrun.cmd"), _fs.default.readFileSync(_path.default.join(bin, "kwrun-n" + v + ".cmd")));
      writeCmd(_path.default.join(bin, "kwrun-legacy.cmd"), _fs.default.readFileSync(_path.default.join(bin, "kwrun-legacy-n" + v + ".cmd"))); //writeCmd(Path.join(bin, "node.cmd"), Fs.readFileSync(Path.join(bin, "node-n" + v + ".cmd")))

      _fs.default.writeFileSync(_path.default.join(bin, "node.cmd"), _fs.default.readFileSync(_path.default.join(bin, "node-n" + v + ".cmd"))); //Fs.writeFileSync(Path.join(bin, "kwrun-legacy.cmd"), )

    }

    await this.setExtensions({
      type: "application/kwruntime.script",
      description: "KwRuntime Script",
      extensions: [".kws", ".kw.ts", ".kwc"],
      terminal: true
    });
    await this.setExtensions({
      type: "application/kwruntime.app",
      description: "KwRuntime Application",
      extensions: [".kwr", ".kwb"],
      terminal: false
    });
    await this.setExtensions({
      type: "application/kwruntime.package",
      description: "KwRuntime Package",
      extensions: [".kwt"],
      terminal: false
    });

    let Child = require("child_process");

    try {
      Child.execSync("ie4uinit.exe -ClearIconCache");
    } catch (e) {}

    try {
      Child.execSync("ie4uinit.exe -show");
    } catch (e) {}
  }

  installKwcore() {
    if (_os.default.platform() == "win32") {
      return this.installKwcoreWin32();
    } else {
      return this.installKwcoreUnix();
    }
  }

  $runtimePaths() {
    let kawixFolder = _path.default.join(_os.default.homedir(), "KwRuntime");

    if (!_fs.default.existsSync(kawixFolder)) _fs.default.mkdirSync(kawixFolder);

    let bin = _path.default.join(kawixFolder, "bin");

    if (!_fs.default.existsSync(bin)) _fs.default.mkdirSync(bin);

    let src = _path.default.join(kawixFolder, "src");

    if (!_fs.default.existsSync(src)) _fs.default.mkdirSync(src);

    let runtimeFolder = _path.default.join(kawixFolder, "runtime");

    if (!_fs.default.existsSync(runtimeFolder)) _fs.default.mkdirSync(runtimeFolder);
    return {
      src,
      runtime: runtimeFolder,
      bin,
      folder: kawixFolder
    };
  }

  async installUtils() {
    // what utils? 
    // npx
    // npm
    // node-gyp
    // yarn?
    // pnpm?
    let kawixFolder = _path.default.join(_os.default.homedir(), "KwRuntime");

    if (!_fs.default.existsSync(kawixFolder)) _fs.default.mkdirSync(kawixFolder);

    let utils = _path.default.join(kawixFolder, "utils");

    if (!_fs.default.existsSync(utils)) _fs.default.mkdirSync(utils);
    let executerContentNode = `#!/usr/bin/env node
		var Path = require('path')
		var Os = require('os')
		let oargs = process.argv.slice(2)
		process.argv = [process.argv[0], process.argv[1]]
		var file  = Path.join(Os.homedir(), 'KwRuntime/src/kwruntime.js')
		
		require(file)
		if(oargs.length){
			for(let i=0;i<oargs.length;i++) process.argv.push(oargs[i])
		}
		var Runner = function(){}
		Runner.execute = async function(modname, bin, force){
			let mod= await global.kawix.import(__dirname + "/krun.ts")
			return await mod.Runner.execute(modname,bin,force)
		}
		exports.Runner = Runner 
		`;
    let executerContent = `#!/usr/bin/env kwrun
		import Path from 'path'
		import Os from 'os'
		import fs from 'fs'
		import Child from 'child_process'
		
		export class Runner{
		
		
			static async execute(modname: string, bin: string = '', force:boolean = false){
		
				let kawi = Path.join(Os.homedir(), ".kawi")
				let utils = Path.join(kawi, "utils")
				if(!fs.existsSync(utils)){
					fs.mkdirSync(utils)
				}
		
				let file = Path.join(utils,  modname + ".json")
				let data = null, needcheck = false
				if(fs.existsSync(file)){
					let content = await fs.promises.readFile(file,'utf8')
					try{
						data = JSON.parse(content)
					}catch(e){}
		
					if(data){
						if(Date.now() - data.time > (24*3600000)){
							needcheck = true
						}
					}
				}
				
				if(force) data = null
				needcheck = needcheck || (!data)
				// get last version of npm?
				if(needcheck){
					let uid = parseInt(String(Date.now()/24*3600000)).toString() + ".json"
					let nname = modname 
					if(nname == 'npm'){
						nname += "@9.x"
					}
					else if(nname == 'pnpm'){
						nname += "@7.x"
					}
					let pack = await import("https://unpkg.com/"+nname+"/package.json?date=" + uid)
					
					if(pack.version != data?.version){
		
						console.info("> Installing/Updating "+modname+" version:", pack.version)
						let mod = await import(${JSON.stringify(Kawix.packageLoaders.pnpm)})
						let reg = new mod.Registry()
						data = await reg.resolve(modname + "@" + pack.version)
						data.time = Date.now()
						
					}
				}
		
				if(!data){
					console.error("> Failed to get/install " + modname)
					return process.exit(1)
				} 
		
		
				if(needcheck){
					await fs.promises.writeFile(file, JSON.stringify(data))
				}
				let exe = data.packageJson.bin
				if(typeof exe == "object"){
					exe = exe[bin] || exe[Object.keys(exe)[0]]
				}

		
				let cli = Path.join(data.folder, exe)
				if(!fs.existsSync(cli)){
					cli += ".js"
					if(!fs.existsSync(cli)){
						return this.execute(modname, bin, true)
					}
				}
				let p = Child.spawn(process.execPath, [cli, ...process.argv.slice(2)],{
					stdio:'inherit'
				})
				p.on("exit", (code)=> process.exit(code))
				
		
			}
		}
		`;

    let runfile1 = _path.default.join(utils, "krun.ts");

    await _fs.default.promises.writeFile(runfile1, executerContent);

    let runfile = _path.default.join(utils, "run.js");

    await _fs.default.promises.writeFile(runfile, executerContentNode); // generate files for each 

    let npm = `#!${process.argv[0]}
		const {Runner} = require(${JSON.stringify(runfile)})
		Runner.execute("npm", "npm")
		`;
    let npx = `#!${process.argv[0]}
		const {Runner} = require(${JSON.stringify(runfile)})
		Runner.execute("npm", "npx")
		`;
    let nodegyp = `#!${process.argv[0]}
		const {Runner} = require(${JSON.stringify(runfile)})
		Runner.execute("node-gyp")
		`;
    let yarn = `#!${process.argv[0]}
		const {Runner} = require(${JSON.stringify(runfile)})
		Runner.execute("yarn", "yarn")
		`;
    let yarnpkg = `#!${process.argv[0]}
		const {Runner} = require(${JSON.stringify(runfile)})
		Runner.execute("yarn", "yarnpkg")
		`;
    let pnpm = `#!${process.argv[0]}
		const {Runner} = require(${JSON.stringify(runfile)})
		Runner.execute("pnpm", "pnpm")
		`;
    let pnpx = `#!${process.argv[0]}
		const {Runner} = require(${JSON.stringify(runfile)})
		Runner.execute("pnpm", "pnpx")
		`;
    let ext = '';
    let files = {
      npm,
      npx,
      "node-gyp": nodegyp,
      yarn,
      yarnpkg,
      pnpm,
      pnpx
    };
    if (_os.default.platform() == "win32") ext = '.ts';

    for (let id in files) {
      let file = _path.default.join(utils, id + ext);

      await _fs.default.promises.writeFile(file, files[id]);
      if (_os.default.platform() != "win32") await _fs.default.promises.chmod(file, "775");
    }

    if (_os.default.platform() == "win32") {
      for (let id in files) {
        let file = _path.default.join(utils, id + ".cmd");

        let filets = _path.default.join(utils, id + ".ts");

        let content = `@echo off\nset NODE_SKIP_PLATFORM_CHECK=1\n"${process.argv[0]}" "${process.argv[1]}" "${filets}" %*`;
        await _fs.default.promises.writeFile(file, content);
      }
    }
  }

  async installKwcoreWin32() {
    let $paths = this.$runtimePaths();
    let kawixFolder = $paths.folder;
    let bin = $paths.bin;
    let runtimeFolder = $paths.runtime;

    if (process.env.PATH.indexOf(bin) < 0) {
      // setx path
      let child = require("child_process");

      child.execSync(`setx path "${bin};%path%"`);
    }

    let defaultExes = {
      term: _path.default.join(runtimeFolder, "default_executable.dll"),
      gui: _path.default.join(runtimeFolder, "default_gui_executable.dll")
    };
    if (!_fs.default.existsSync(defaultExes.term)) delete defaultExes.term;
    if (!_fs.default.existsSync(defaultExes.gui)) delete defaultExes.gui;

    let writeCmd = function (file, text) {
      _fs.default.writeFileSync(file, text);

      if (defaultExes.term) {
        let nfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + ".exe");

        let cfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + ".exe.config");

        try {
          _fs.default.writeFileSync(nfile, _fs.default.readFileSync(defaultExes.term));

          _fs.default.writeFileSync(cfile, `<configuration>
<startup>
	<supportedRuntime version="v4.0"/>
	<supportedRuntime version="v2.0.50727"/>
</startup>
</configuration>
				  `);
        } catch (e) {
          console.error("[WARNING] Failed writing executable wrapper:", nfile);
        }
      }

      if (defaultExes.gui) {
        let nfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + "-gui.exe");

        let cfile = _path.default.join(_path.default.dirname(file), _path.default.basename(file, _path.default.extname(file)) + "-gui.exe.config");

        try {
          _fs.default.writeFileSync(nfile, _fs.default.readFileSync(defaultExes.gui));

          _fs.default.writeFileSync(cfile, `<configuration>
<startup>
	<supportedRuntime version="v4.0"/>
	<supportedRuntime version="v2.0.50727"/>
</startup>
</configuration>
				  `);
        } catch (e) {
          console.error("[WARNING] Failed writing executable wrapper:", nfile);
        }
      }
    };

    let src = $paths.src;

    let kwcoreFolder = _path.default.join(_os.default.homedir(), "Kawix");

    let kwcoreFile = _path.default.join(src, "kwcore.app.js");

    let kwcoreCli = _path.default.join(kwcoreFolder, "core", "bin", "cli");

    let exe = this.$kawix.executable;
    await this.$downloadKwcore(kwcoreFile);
    let nodev = process.version.split(".")[0].substring(1);
    let content = `@echo off\r\nset NODE_SKIP_PLATFORM_CHECK=1\r\n"${exe.cmd}" "${kwcoreCli}" %*`;

    let binFile = _path.default.join(bin, "kwcore-n" + nodev + ".cmd");

    _fs.default.writeFileSync(binFile, content);

    content = `@echo off\r\nset NODE_SKIP_PLATFORM_CHECK=1\r\n"${exe.cmd}" --insecure-http-parser "${kwcoreCli}" %*`;
    binFile = _path.default.join(bin, "kwcore-legacy-n" + nodev + ".cmd");

    _fs.default.writeFileSync(binFile, content);

    let files = _fs.default.readdirSync(bin);

    let fileinfo = files.filter(a => a.startsWith("kwcore-") && a.endsWith(".cmd")).map(a => ({
      name: a,
      v: a.split("-").slice(-1)[0].split(".")[0].substring(1)
    }));
    fileinfo.sort((a, b) => Number(a.v) - Number(b.v));

    if (fileinfo.length) {
      let v = fileinfo[fileinfo.length - 1].v;
      writeCmd(_path.default.join(bin, "kwcore.cmd"), _fs.default.readFileSync(_path.default.join(bin, "kwcore-n" + v + ".cmd")));
      writeCmd(_path.default.join(bin, "kwcore-legacy.cmd"), _fs.default.readFileSync(_path.default.join(bin, "kwcore-legacy-n" + v + ".cmd"))); //Fs.writeFileSync(Path.join(bin, "kwrun.cmd"), )
      //Fs.writeFileSync(Path.join(bin, "kwrun-legacy.cmd"), )
    }

    await this.setExtensions({
      type: "application/kwcore.script",
      description: "Script de KawixCore",
      extensions: [".kwo", ".kwe"],
      terminal: true,
      appName: "kwcore"
    });
    await this.setExtensions({
      type: "application/kwcore.app",
      description: "Aplicación de KawixCore",
      extensions: [".kwa"],
      terminal: false,
      appName: "kwcore-gui"
    });

    let Child = require("child_process");

    try {
      Child.execSync("ie4uinit.exe -ClearIconCache");
    } catch (e) {}

    try {
      Child.execSync("ie4uinit.exe -show");
    } catch (e) {}
  }

  async $downloadKwcore(kwcoreFile) {
    // download file 
    let exe = this.$kawix.executable;
    let uri = "https://raw.githubusercontent.com/kodhework/kawix/master/core/dist/kwcore.app.js";
    await new Promise(function (resolve, reject) {
      _https.default.get(uri, {
        timeout: Number(process.env.REQUEST_TIMEOUT || 8000)
      }, res => {
        try {
          let buffer = [];
          res.on("data", function (bytes) {
            buffer.push(bytes);
          });
          res.on("end", function () {
            try {
              let data = Buffer.concat(buffer);

              _fs.default.writeFileSync(kwcoreFile, data);

              resolve(null);
            } catch (e) {
              reject(e);
            }
          });
        } catch (e) {
          reject(e);
        }
      }).on("error", reject);
    });

    let p = require("child_process").spawn(exe.cmd, [kwcoreFile]);

    await new Promise(function (resolve, reject) {
      p.on("exit", resolve);
      p.on("error", reject);
    });
  }

  async installKwcoreUnix() {
    let kawixFolder = _path.default.join(_os.default.homedir(), "KwRuntime");

    if (process.getuid() == 0) {
      if (!_fs.default.existsSync("/usr/KwRuntime")) {
        _fs.default.mkdirSync("/usr/KwRuntime");
      }

      if (_fs.default.existsSync(kawixFolder)) {
        _fs.default.unlinkSync(kawixFolder);
      }

      _fs.default.symlinkSync("/usr/KwRuntime", kawixFolder);

      kawixFolder = "/usr/KwRuntime";
    } else {
      if (!_fs.default.existsSync(kawixFolder)) _fs.default.mkdirSync(kawixFolder);
    }

    let bin = _path.default.join(kawixFolder, "bin");

    let src = _path.default.join(kawixFolder, "src");

    if (!_fs.default.existsSync(bin)) _fs.default.mkdirSync(bin);
    if (!_fs.default.existsSync(src)) _fs.default.mkdirSync(src);

    let kwcoreFolder = _path.default.join(_os.default.homedir(), "Kawix"); // download kwcore 


    let exe = this.$kawix.executable;
    let nodev = process.version.split(".")[0].substring(1);
    let content, binFile;

    let kwcoreFile = _path.default.join(src, "kwcore.app.js");

    let kwcoreCli = _path.default.join(kwcoreFolder, "core", "bin", "cli"); // download file 


    let uri = "https://raw.githubusercontent.com/kodhework/kawix/master/core/dist/kwcore.app.js";
    await new Promise(function (resolve, reject) {
      _https.default.get(uri, res => {
        try {
          let buffer = [];
          res.on("data", function (bytes) {
            buffer.push(bytes);
          });
          res.on("end", function () {
            try {
              let data = Buffer.concat(buffer);

              _fs.default.writeFileSync(kwcoreFile, data);

              resolve(null);
            } catch (e) {
              reject(e);
            }
          });
        } catch (e) {
          reject(e);
        }
      }).on("error", reject);
    });

    let p = require("child_process").spawn(exe.cmd, [kwcoreFile]);

    await new Promise(function (resolve, reject) {
      p.on("exit", resolve);
      p.on("error", reject);
    });
    content = `#!/usr/bin/env bash\n${exe.cmd} "${kwcoreCli}" "$@"\nexit $?`;
    binFile = _path.default.join(bin, "kwcore-n" + nodev);

    _fs.default.writeFileSync(binFile, content);

    _fs.default.chmodSync(binFile, "775");

    content = `#!/usr/bin/env bash\n${exe.cmd} --insecure-http-parser "${kwcoreCli}" "$@"\nexit $?`;
    binFile = _path.default.join(bin, "kwcore-legacy-n" + nodev);

    _fs.default.writeFileSync(binFile, content);

    _fs.default.chmodSync(binFile, "775");

    let files = _fs.default.readdirSync(bin);

    let fileinfo = files.filter(a => a.startsWith("kwcore-")).map(a => ({
      name: a,
      v: a.split("-").slice(-1)[0].substring(1)
    }));
    fileinfo.sort((a, b) => Number(a.v) - Number(b.v));

    if (fileinfo.length) {
      let v = fileinfo[fileinfo.length - 1].v;

      try {
        _fs.default.unlinkSync(_path.default.join(bin, "kwcore"));
      } catch (e) {}

      try {
        _fs.default.unlinkSync(_path.default.join(bin, "kwcore-legacy"));
      } catch (e) {}

      _fs.default.symlinkSync(_path.default.join(bin, "kwcore-n" + v), _path.default.join(bin, "kwcore"));

      _fs.default.symlinkSync(_path.default.join(bin, "kwcore-legacy-n" + v), _path.default.join(bin, "kwcore-legacy"));
    }

    this.$addPathUnix(bin);
    await this.$desktopFile({
      appName: "kwcore",
      id: "kawixcoreapp-terminal",
      terminal: true,
      title: 'Kawix Core',
      types: ["application/kwcore.script"],
      nodisplay: true
    });
    await this.$desktopFile({
      appName: "kwcore",
      id: "kawixcoreapp",
      terminal: false,
      title: 'Kawix Core',
      types: ["application/kwcore.app"],
      nodisplay: true
    });
    await this.$removeMimetypes("kwcoreapp_");
    await this.setExtensions({
      appName: "kwcore",
      type: "application/kwcore.script",
      description: "Script de KawixCore",
      extensions: [".kwo", ".kwe"],
      terminal: true
    });
    await this.setExtensions({
      appName: "kwcore",
      type: "application/kwcore.app",
      description: "Aplicación de KawixCore",
      extensions: [".kwa"],
      terminal: false
    });
  }

  $addPathUnix(folder) {
    // ADD TO PATH
    let pathsToWrite = [];
    pathsToWrite.push(_path.default.join(_os.default.homedir(), ".profile"));
    pathsToWrite.push(_path.default.join(_os.default.homedir(), ".bashrc"));
    pathsToWrite.push(_path.default.join(_os.default.homedir(), ".zshrc"));

    let config = _path.default.join(_os.default.homedir(), ".config");

    if (!_fs.default.existsSync(config)) _fs.default.mkdirSync(config);
    config = _path.default.join(config, "fish");
    if (!_fs.default.existsSync(config)) _fs.default.mkdirSync(config);
    config = _path.default.join(config, "config.fish");
    pathsToWrite.push(config);

    if (process.getuid() == 0) {
      // put global 
      pathsToWrite.push("/etc/profile");
      pathsToWrite.push("/etc/bash.bashrc");
      pathsToWrite.push("/etc/fish/config.fish");
      if (!_fs.default.existsSync("/etc/fish")) _fs.default.mkdirSync("/etc/fish");
    }

    let lines = ["# KWRUNTIME PATH #", `export "PATH=${folder}:$PATH"`];

    for (let i = 0; i < pathsToWrite.length; i++) {
      let path = pathsToWrite[i];

      if (!_fs.default.existsSync(path)) {
        _fs.default.writeFileSync(path, lines.join("\n"));
      } else {
        let content = _fs.default.readFileSync(path, "utf8");

        let lns = content.split("\n");
        let i = lns.indexOf(lines[0]);

        if (i < 0) {
          lns.push(lines[0]);
          lns.push(lines[1]);
        } else {
          lns[i + 1] = lines[1];
        }

        _fs.default.writeFileSync(path, lns.join("\n"));
      }
    }
  }

  async selfInstallUnix() {
    let kawixFolder = _path.default.join(_os.default.homedir(), "KwRuntime");

    if (process.getuid() == 0) {
      if (!_fs.default.existsSync("/usr/KwRuntime")) _fs.default.mkdirSync("/usr/KwRuntime");
      if (_fs.default.existsSync(kawixFolder)) _fs.default.unlinkSync(kawixFolder);

      _fs.default.symlinkSync("/usr/KwRuntime", kawixFolder);

      kawixFolder = "/usr/KwRuntime";
    } else {
      if (!_fs.default.existsSync(kawixFolder)) _fs.default.mkdirSync(kawixFolder);
    }

    let bin = _path.default.join(kawixFolder, "bin");

    if (!_fs.default.existsSync(bin)) _fs.default.mkdirSync(bin);

    let utils = _path.default.join(kawixFolder, "utils");

    if (!_fs.default.existsSync(utils)) _fs.default.mkdirSync(utils); // generate 

    let exe = this.$kawix.executable;
    let nodev = process.version.split(".")[0].substring(1);
    let content, binFile;
    content = `#!/usr/bin/env bash\n${exe.cmd} ${exe.args.join(" ")} "$@"\nexit $?`;
    binFile = _path.default.join(bin, "kwrun-n" + nodev);

    _fs.default.writeFileSync(binFile, content);

    _fs.default.chmodSync(binFile, "775");
    /*
    let content = `#!${exe.cmd}\nprocess.argv[1] = ${JSON.stringify(exe.args[0])};require(process.argv[1]);`
    let binFile = Path.join(bin, "kwrun-n" + nodev)
    Fs.writeFileSync(binFile, content)
    Fs.chmodSync(binFile, "775")
    */

    /*
    if(process.getuid() == 0){
    	let binFile1 = "/usr/bin/kwrun"
    	Fs.symlinkSync(binFile, binFile1)
    }*/


    content = `#!/usr/bin/env bash\n${exe.cmd} --insecure-http-parser ${exe.args.join(" ")} "$@"\nexit $?`;
    binFile = _path.default.join(bin, "kwrun-legacy-n" + nodev);

    _fs.default.writeFileSync(binFile, content);

    _fs.default.chmodSync(binFile, "775");
    /*
    if(process.getuid() == 0){
    	binFile = "/usr/bin/kwrun-legacy-n" 
    	Fs.writeFileSync(binFile, content)
    	Fs.chmodSync(binFile, "775")
    }*/


    let files = _fs.default.readdirSync(bin);

    let fileinfo = files.filter(a => a.startsWith("kwrun-")).map(a => ({
      name: a,
      v: a.split("-").slice(-1)[0].substring(1)
    }));
    fileinfo.sort((a, b) => Number(a.v) - Number(b.v));

    if (fileinfo.length) {
      let v = fileinfo[fileinfo.length - 1].v;

      try {
        _fs.default.unlinkSync(_path.default.join(bin, "kwrun"));
      } catch (e) {}

      try {
        _fs.default.unlinkSync(_path.default.join(bin, "kwrun-legacy"));
      } catch (e) {}

      _fs.default.symlinkSync(_path.default.join(bin, "kwrun-n" + v), _path.default.join(bin, "kwrun"));

      _fs.default.symlinkSync(_path.default.join(bin, "kwrun-legacy-n" + v), _path.default.join(bin, "kwrun-legacy"));
    }

    this.$addPathUnix(bin + ":" + utils);
    await this.$desktopFile({
      appName: "kwrun",
      id: "kwruntimeapp-terminal",
      title: 'Kawix Runtime',
      terminal: true,
      types: ["application/kwruntime.script"],
      nodisplay: true
    });
    await this.$desktopFile({
      appName: "kwrun",
      id: "kwruntimeapp",
      terminal: false,
      title: 'Kawix Runtime',
      types: ["application/kwruntime.app", "application/kwruntime.package"],
      nodisplay: true
    });
    await this.$removeMimetypes("kwrunapp_");
    await this.setExtensions({
      type: "application/kwruntime.script",
      description: "Script de Kawix Runtime",
      extensions: [".kws", ".kw.ts", ".kwc"],
      terminal: true
    });
    await this.setExtensions({
      type: "application/kwruntime.app",
      description: "Aplicación de Kawix Runtime",
      extensions: [".kwr", ".kwb"],
      terminal: false
    });
    await this.setExtensions({
      type: "application/kwruntime.package",
      description: "Paquete de Kawix Runtime",
      extensions: [".kwt"],
      terminal: false
    });
    console.info("Application added to PATH. Maybe you need restart shell.");
  }

}

exports.Installer = Installer;

var _kawix = /*#__PURE__*/new WeakMap();

var _filename = /*#__PURE__*/new WeakMap();

class BinaryData {
  constructor(kawix, filename) {
    _kawix.set(this, {
      writable: true,
      value: void 0
    });

    _filename.set(this, {
      writable: true,
      value: void 0
    });

    _classPrivateFieldSet(this, _kawix, kawix);

    _classPrivateFieldSet(this, _filename, filename);
  }

  async getMetadata() {
    var _binary;

    let binary = Kawix.$binaryMetadata.get(_classPrivateFieldGet(this, _filename));

    if (!binary) {
      let modCache = _classPrivateFieldGet(this, _kawix).$modCache.get(_classPrivateFieldGet(this, _filename)) || {}; //console.info("Here --->", modCache)

      let mod = (modCache.module || {}).exports || {}; //let mod = await this.#kawix.import(this.#filename)    

      binary = mod.__binary;

      if (binary) {
        Kawix.$binaryMetadata.set(_classPrivateFieldGet(this, _filename), binary);
      }
    }

    return (_binary = binary) === null || _binary === void 0 ? void 0 : _binary.metadata;
  }

  async getStream(name, options = {}) {
    let metadata = await this.getMetadata();

    if (metadata) {
      let binary = Kawix.$binaryMetadata.get(_classPrivateFieldGet(this, _filename));
      let meta = metadata[name];

      if (meta) {
        //console.info("Binary:", binary)
        let boffset = meta.offset + binary.length + binary.start;
        let start = (options.start || 0) + boffset;
        let end = boffset + meta.length - 1;

        if (options.length !== undefined) {
          end = Math.min(options.length + start - 1, end);
        }

        if (options.end) end = options.end;
        return _fs.default.createReadStream(binary.filename, {
          start,
          end
        });
      }
    }
  }

  async read(name, offset = 0, count) {
    let metadata = await this.getMetadata();

    if (metadata) {
      let binary = Kawix.$binaryMetadata.get(_classPrivateFieldGet(this, _filename));
      let meta = metadata[name];

      if (meta) {
        let boffset = meta.offset + binary.start;
        let fd = binary.fd || 0,
            buffer = null;

        try {
          if (!fd) {
            fd = await new Promise(function (a, b) {
              _fs.default.open(binary.filename, "r", function (er, fd) {
                if (er) return b(er);
                return a(fd);
              });
            });
            if (_os.default.platform() != "win32") binary.fd = fd;
          }

          if (count == undefined) count = meta.length;
          let len = Math.min(meta.length, count);
          buffer = Buffer.allocUnsafe(len);
          await new Promise(function (a, b) {
            _fs.default.read(fd, buffer, 0, buffer.length, boffset + offset, function (er, fd) {
              if (er) return b(er);
              return a(fd);
            });
          });
        } catch (e) {
          throw e;
        } finally {
          if (fd && _os.default.platform() == "win32") {
            await new Promise(function (a, b) {
              _fs.default.close(fd, function (er) {
                if (er) return b(er);
                return a();
              });
            });
          }
        }

        return buffer;
      }
    }
  }

}

exports.BinaryData = BinaryData;

class Kawix {
  constructor() {
    _defineProperty(this, "$cacheType", 'json');

    _defineProperty(this, "appArguments", []);

    _defineProperty(this, "optionsArguments", []);

    _defineProperty(this, "customImporter", new Array());

    _defineProperty(this, "customImportInfo", new Array());

    _defineProperty(this, "transpiler", 'babel');

    _defineProperty(this, "$esbuildTranspiler", null);

    _defineProperty(this, "$importing", new Map());

    _defineProperty(this, "$modCache", new Map());

    _defineProperty(this, "$originals", new Map());

    _defineProperty(this, "$startParams", {});

    _defineProperty(this, "packageLoader", Kawix.packageLoaders["pnpm"]);

    _defineProperty(this, "packageLoaderEnv", {});
  }

  get $class() {
    return Kawix;
  }

  get argv() {
    return this.appArguments;
  }

  get version() {
    return "1.1.34";
  }

  get installer() {
    if (!this.$installer) {
      this.$installer = new Installer(this);
    }

    return this.$installer;
  }

  get executable() {
    return {
      cmd: this.originalArgv[0],
      args: [this.originalArgv[1]]
    };
  }

  static getData(filename, name) {
    let data = Kawix.$modulesData.get(filename);

    if (data) {
      return data.get(name);
    }
  }

  static setData(filename, name, value) {
    let data = Kawix.$modulesData.get(filename);
    if (!data) Kawix.$modulesData.set(filename, data = new Map());
    data.set(name, value);
  }

  getData(filename, name) {
    return Kawix.getData(filename, name);
  }

  setData(filename, name, value) {
    return Kawix.setData(filename, name, value);
  }

  get pngCompressedIcons() {
    let base64 = `H4sIAAAAAAAAA+y8BVBc4fc2tjghECxY8MXdgwdbgrt7cAjuzkIIsEACwd3dg7sF9xAsOEGDu8v25vd9/05n2mmn036d6bR3hlnC3ve85z3nOec8z2WDjS2buZO9kysH6H/cxQlc/Px8/165+Pk4/5ev/3WBuHh5+Xl5eTk5uXlBnFxcfHz8ICq+/4E+/c+Xh5u7qSsVFeijqYOl2//Off9H7/+/9LL5r/zzcXF7A1//I3DwfyL/PMA7QP65+bh4/v/8/z9x/a/yb+rs7PZ/Mwj+z+efh5fv7f+f//8nrv/t/Nt5uXo4uts6WAL/Ynd2tP6/tse/BL/l5f3fzj8XNyfvW97/nn8e/rfc3ED+3/IDY4CK8/+eI/7vX/8fz3+EqrIMFsYbDOBbLDlZiDoIhAD/94WOCvxE72ymE3h54SyrBxz9Vd+/L4REllekIBAVSA4ioemdcbji429o2SF2OnkjuDtm4ZRWYNf6i942N6HqUBhFQvz1JZojjMVYurobpQdFWroZ44Y5b73K8NSXAIFArVpWAiM07tiWW+FXve00n1IafXyq4OjF09PUjEGOQlKqz0Sqz2o1Uecv950M7Lgx64lUa2qbtB1hJSUlyz/O3hUJtfLoXNrygkmwAe4LXfCblzlk4rhBrlZvETQRORE0Qej4ai9AnG4koINTc3w1dPG99MnhMVsQkgxsE0+NEhSe+oBQEGETlBoPUg/vpM+jsDo23aGghsQk1MqgT20KKHtZWm6vLi4u0pAbTPOiyHqAlFh4a3RZWQvtcSQVk9WV8SVnuC9e
		g6ZBM4gpkhDphQnqz96xMMmxQ8RTUFDqi6CeMdRXnRGMiKqshawonGGwH/kClvxBDmPLEhByUCPPhTY1hJfsVZNi+ls2wUUog9J02PvkriJLOVq8Uuq8FtAOjhpSEPDCeeEO5n49GGKbxoLZK+CXonKQrE4B+jk5hgRSB5ExFY6OIQYxFbL29AjjJ0I0eRJCuOvQcjJhaSBenov3ILbozfqxdP5JCqv3StPRUsAGX9XNzfO1jI0D8YJQwp+p83xAZbP0wo24SXDnwhSf5IRaNHFJ+T3Oug87ZlZVAz1tZIOt6euINpY7SpD62FRSpWn7DD67uWPW3bn69qJRk+mw3NLS0rHaCmlv86lsZKqCtwun2yWPMRGpdDwnFjui6iOBTIVoVJgfEINKvae9Q3uzmr7C3qTeeYA/Yob3fp0uVjkZtvRUeslt9JzmiTk+Pn4VZprxat0dLBSfunv3JymA/jb3MaY3Sd3RcofdSpnL7fdF+wuQFdleFwJPE/l12Pr2xMTEwEv25m6tbwbT/irACbH2//5lVC6eLlZgmuzrqRUj7/72ru5VHigBPkVbkJBemLCiLm+2w2yVFfBZIu4FiAWhHXm9Py8vT8tXNbeIvGDUhEV3NJmDv1g50zcywZUkyHLM35P9/cKDdNAonC1lwXKnUn3E6DxnGGSFFytwaMrOU82QlxxhI8342lcZqplDwGz0rN/zwYqGMIqNPu9lyp0kWOilTMqJMeN56WPM59S2woTKqgP6lJYw2M76dy7kEB5MY6RTa6Ztk52x1LowWEFtd1qSVOtj
		QzthBOTjZ5xkxGaybjpQ2WuZ86/+HHAaWe8sIhejG1BQDUi5zxSJL9WHIwhOlyeGdLt2f3/fEen6UX9u73z+HINHw87uQJJpe8nl+6lKwHSliYMqQhKclPMiaNenpkcPNR5mM2cKZYiw4QvqwpvKtp7MeirrZMnZxgf8X+fj4wtlHdVHXf8I9hUOkivjQZHITYan+2Q1acgvMBfyolp7aJLdC1utKkFUkG5XgpHQjHVrLSLyOcuKvqaxQ9m+mdXoEqM5bZr0jJ2A81yA9V/Z4fnmVjryCxs+xk0JriPpxxiXIO/36GeDEPDZ4SeUl3gY+R8XYX/P5xHzgUsgVdEYY/0NSIci0LIIK5sdnmu+k7Lrk5m1q4T60/m3yRWCdxIsS7F4enIinb/aRA2iREoIYKiaqw7Wb0aE2JwFW0XJUfQo8s8dhVoUJCwVJpBn7WptfudHDPEjF6H77G1/fbgApQGrGMkrCb8FVnL0b57FFyRQIp8GgtPyhFTe/doW8w1xQlwUmUz3vJVBAnki3iYmnE8Juu3YqyaqTEcD5bpDCnQjrSTLjnRYFZpz0r7InXIy1EqOaclw3sF6B5VsORkE6h4bh1yWWOp1ZQAr2UNx+Y6y3e/s5AE/BzdHQf543QQCI+/Z9Xf2zidfWV0XJNgZzSvxXGxIlb/nrpOBwF+uF2dmZnbNP7yyYQbSmmDj5FTtTrYrNfaYyr/CPusKSYYqkzmTWXck1KJ2L0utWewYgQL3Wo97GTLdf2l7nNVLFo6ajJbqsnpSBJGm3u1vHm5WWaayw5fj1N+2
		VbXpyLecfk9lZg8SA3kXVFUdC4LNQnEbEPOANa0eB3OJSQkJ/ujdSgKH+zIaCsldb8aWT1qP9Zm2kUFX4QFiE2MxzVUPUT4XOx4sX0oIQABy5urr6xXfYm7Sg/glq0tPhFsfZ+PV34tOHsSqs/9Yf4c0loF8ygLCBthePSNWyTYbsGSg36wmdMyfB9coqvet8tSjdHJX9aEnWfHCRfsdRBOLbNkE1M0z9ngExK9CNUNllAcoji8frCIHN5N5Ltgg7sH7Iotne+c3hfUHrXaik6TY65//xSFx7LEyLCxM7C9WWL3iz+3qrxg8UTa89xTUfUQIGRVCMW/dWx+folILE2qnPIzwu/N6n5lHxrBxpvKvrq5ste7q16eBNUPn26Pjw/EMXTGwY2ROGQ8Kh1v3O7SQBO4dAWVKHg6RelE+HgDgJ78bnwI6soPe4gG+mdra29ePjI6uKUBM+kxpEhvWp7YpWdVHmjcFMgWa77dz+7+3gpZN9PXvO4D5guCxV58ztV2NJaehocH4GiPgS6qYCmRac3fqvUoylJPLLXxT4Eh9ZBq7MpHLm2H93WhtoIDbzljC/pc0OACI6IhUaaDO+dRHnPCm7Gd96seAzezVR8irDhrlmVSED5W6KcD32KO1neVryDaDQGKFywAw0AX55aCdb9MZPd8Fp3oJRE9TFxrKQwbWbxoRmgddMrIngaGhTaZ2QW30vGjQt3nGU5BwgzflU1Zns5A/KtYlyyRsNL9yXcSPUCkJ4xjLEn140eH+3VMAuFtMGhx7Jwl7ABkWCUUlBbQ+XsTv
		+hxVHXgi6Pr+boL/8VmtdNudcNBMVLggMnp+k5aWViaZ+1Mn5W46vIq4/rEYsA50mWGPFWOQNSKIhyeIoSChaTJT2Cvql3Oaa+vjy9/r9R3Y+FOioI9AjFwVkqGmzkZeX3d9LIkz0oSbvbpDIJfjQCdE+jhtW/b3nEN1yubSFewLEg/ZZ017A6yP3Gw9ZsnaHUdytjkJMhp73AZAkr1HF/Iyhh2OOL28bOhEPIAEcQ8FbtcHbsfmuRGKvmhNOLcHM795XH0Dgv/6+fO7vIsIW7j7HREsOjp6w4L77q5n2/tK2S8NMEFfaE9pyHZqv75ujAi5xAc17cUgYoQAb3B6R8GpQTya1lOPwCQeGGMhHyTpHWN4FWjHwLM29fPnacmvD/9696T5lE09YbdXxN83s3q88H/YkG+pevCavJhA5iQEpdxxQNw1AgIC0jfs9ZPQZxHqx0iXrW7wQWkeZ3ZpnmTSRbbGFBihvhF/J8fGIO5MPPzS+VPVjU1NRKWvSiyzOs8nec68/WMTzgch9X9vY+YwUjsBGEHk79IcluJfOaz3j42P+fcC3cpYJ1NplMzo2SevpmaqrKSkGaV7Pgft0lYqBwBRmPGgi7Y8E0dfzzx+ciolVV71zPx8sVb49D/UUgA9+CXCI2K3f79aPZnpDgJ4cXysDXRIndcBUh/LoMrre/f79zH9YcAhsdH30uSOjcBGhfsFFqU4HW6qlY2P5ehhpoqBFzVsMFpcOXywA7cFbIgRVzsvg60J8QcFTUXwx89jb9R4VamlCXATX1APYBkzRaPlOOHv
		vrAytl56iyBgeWpAiuBf0tkZWPlDVx/17zn29x6C+05egYBJ9UyZ0ZTMsfZQWCPoN+KHJaFqhpaBvUJCZef0w0Kkw0QeNz70WeQZTs5ocb4PVVaSfMHRBt2b46eRL3Jrp4zvhEGenOakuEKgY9bgBqcytV9ipIV70lahGbL9s6AdvCkIiAEh5e2I28eWRFey3eqsXSNxCAGIzOrZysRkTVQhidVFEwjR+2SoOJAUFMjly8c1YVc2AUOQA+gtAoz7Ikngvi1L3nFQftFk5kRIQ0IgOHgYOQ35PRK6Zeqr2NxzsXcDxjgbY8sYqv5fTD3YJeiSQgeSNdVt6HkmPYxuFHs5mUN/mn97Grlo98javeK6EATmjx3aIKK9aqYS6TujZ4TesfciFHDEIA4pk6OHzNExLtS0Fzar24VvxY7tvbK8bjR/b/EFccVE7KOXoHzYETKcGIHbvDrmrQuFvcXNb4mriJ6GzHZL/zkzV/ity1wociNLqWAjX0g+eBf1jyupg97yrBmZmMBPIFulr4qxMtnhIFs7u/Qdn1UogoCOB+ERzJP74iOp6xGPp/Xg5vG1ZvWlFb4zOEQF/JPsG7RonpkDnv8hjHZDQLx89ANEmUjr+i73LNHclI02bxqkWTah+7cggdR+yRN7nNlshwjkn5Obm6vhwO1QAnRlCO+bjlfdNBDe9x6EWKCfg2McSLpXrUvT97COVGEBwRgSa6T2BJi/2OaP6m0oZGzsszZnZSokN9pNcvOIx+awHmyahdThWog3JrLeenyhPqLgcjqhRcSz9hMoTYbZ
		hfrN6e0TNzY2tu0w02XsdfyyutfcVsp4U2kJ7iY+P/bsoctL2vYKxqAdN5hN2L4/DW7JuRjYE0HfRHknrP/9bDeKldK4AEY2gmgOZ7HIpN+CS8YLCK+fc3DOCUKzkcqLS36j53cA5UvCm9qEaBYLKeSaWmF3t/L6TYodO5z4gzsc4sYFSPuiwrnj3qF/Mnl26h+LxejV9wgr2esaIuNvyRiLAiWUTySepLSMumQQFSacgME9Y3aYvc2OANNxAfynAfyXGlOs0T18BW4l9VU1YT8y37GmyfA+G0UizaDwHoW5oPxd9929o6cchX/9Tae66c5sK7z2Rqd+pkJf8stemcY2i5UV03Y22aDgV9gAwl+k01Kg0Q5qWk+vyid3TfLy8WmFSubKIBhWCSkEw1q7KSkVnCLeOTplj/Qlh/jgws6fvWjgAIluHR3yf9I0tz8p3OmzLeRUzke8PcmwGyNrcngABfWHrN1Lq6lNFRcppSdppir40TyFnNAAYVfA7L1luwQVVQgKtGFWX/c8bOqgpt2/Hel0QzBM+upzGagTtA2HpmhIW1SIzFYsekVw5VbJf770JSHpG3sKoURqz4TBUuflmaqzhL2OCYF4hLjfPfzDDAWazAVR+URcTErLAkpWM0uD7QVz9S44qBqsGrpvyEzgfkcZhs1u2m4VXLJ8PfFza7HmtZAWwCyBUeY66EKIp0YXFABa1QFQ31XmZtv6mGjn5MRR6/BADb4v2We9C0tt8ulTEYtbJvMZWZkCrQuB31QLJZv8PYeyWHn3W1QIrZXtdfalfP8O
		uwRL5fePsTU6CIN2eADyZ1JRXv5AiFuzbx+qmNwlCcQASxLGALPJAqx+SvVDeNyP1TxYXGtpI+S8XWk9jVFMhtdweeeE/Siv4mQ4Vzc/3Pv0uZOF3zWg0QEYN6OALIVuCkzI7I6nz1cL6eb+2q6WFaGApiecz4c09darme3MtlneT8XcVO8gUIspfg4t47kDCtj0W3v+KuPabedp/eLZ6zmnOZmg1AWPFWvUphfs/T0BbKuzQIHkCRlQA/bEWQkfyHjWVCBh+6wSA2OikEsTbCEHludvx4aoRTcEG90dsQCt9h/7ZvnD+0rdfKPbx2p8j/7F08VbxZAoRCWGPKaxdsruB9I3b7K0Mst//j2fzB0YeF+el7fxAHoHoKr7yTxGET4vc0/aK/cn4LOzc4CLg7f7XcxilqBm53NHLhPPQAS4A2eek/MiqWcv6AKNaObeUEqqV6rMjQDP6Fnw18yMpqXeHP4/0siKsM15MR0jRN4F5e248kc0Kq4+l5EB+DvnB52on+XzaRpSF5AWY+EPsBTBPwITH63e1astxAgJC4sF9KAQNcuHEKA/SaUhAbO0MeGcA8Kr4JGUY7pDARJrd8ixndU/vkPnYuf4jOLtKpEM3QkVP2BvoD9q/U0MjZbQLBOKWePi8cu6qT1otcaqQjsNByhEJ8pLQlpN61Gve2neUX0DAyLg/QoKl3f26UZDlCZiP393GhSJyXTvlSFtkxo9L9AERU9/3S+6SWkoDgtVywcs+mTdxG0KREWUIHejglvzqqoc0/cN7xSToYQAwY5CeHzlax77
		x7tDpui4yzOn5rd5Zzw6FmCMBTA2GNe288aSxfG71Vg1pyRDycSmtfoI/aDLAEJK99hSQULyPwKWD1iTT4Ym9ZnV2KXcceU9/kZgR5uT6ehEc5KvIuUInsTjlPPI8QcYXHgK9hj3iPH9d0Fz7UTctHyhaBMuNxmhzGOGPHyES54LDywsLKh6JgslQHY+9ZT6Y+PEqmb2n6TczfJNPJ8ErK42v85RATGqZZaqAhAQRcUewynkCFxO85FMRN9r05fpHkOzX4pG0EXsRnE2Dwh4mnw9OAIoDR7WN19XFSBeJRN/vMbaXZFuAnbngq+iQP6orZduysld8hkpyoXQO3dvTyMSkgut4jPqJZeMWfURHlT+zdaO3Nw/gbO55xHscEzTf+ICG7FZzoNQzHxnlnT5CR5o12rL5b7HAqgpUdR7a7W9i2zmNL4m5DBjlnXOsbFGh2pk5531puNKoGTzVvGpeNzvrEE8pECzHYRcms7q+duPKqc+D6Chao9T7aTnFkswFY+u6bTuRkTuvrMaF2CgxRRd3eaM3mynLxRxOI0R+1f6r3HlCnPPg9jham9Yn7Pxp9C0rM9orI5rqE+6ik5mV2mHOfBNP+0rLkoAQgZmwMHH0OFZyLfninjZSRliOG+023r82OOiqYLUXNXZ+a5SSOfb3jllaFFRkSrj63u+IK/SiQ2paOTAwN7uMi1hi/tXoDottF+rssld0FTIV0rO4oasj9pGWFQFQjGU3llNPS4ZqGAMJO/Vi3aviUzhJhWPqhygliUBdUr39PSkgjtFV1Z3+xO+bMkv
		dhbZcXIhIGCm808/vBsco7N452bQnEUPy2PRHDxDmrwwqzpQRlD9MVb9moDAiCvg/pJituWTbDIcvcKgqaq+uflWBeIOdLnAH2Pj1afP1at8P93puKDiHL0HTq2PIcE9SDyq533j0lcvpWiVtTNl+JgslxuPXEKWcqvRnF0AQBgD5t53CWBrWFtby4Fjb2mCXgKxe2lF8df8RKxaqUJRqJvctzfzw09AmCH3reGmPc4r9N3e4Kol7osw+2TNH7c60gXVgN5WrHZdRN5k+WYZv/Imdr/DlpKRkXFhTrynCYrS/GcvcGcAspnNT+ODJq6htTsVBsh/zlDqrFbR5XXFglM/DB80CaZtz0EXea5bVHF5nymAVbdq7mJgdCCu4GARwilzoigBglY5ueQnVlsBpzPnUV+b76+2bYkN85+f/zWeHMCwcm2ESnS4eCMJY0qyXPjXHf2p+9xiZSFOebwQlIcqF4HFpaUo+6VnJFyjCqEo7N+218d+1nCWRqVHuk+rbVQll4lQY+8r/LkxgmJi83dyEJQ7l/QE1xiHJVPwG6QPmQeto8oiZ30BZW7/ev2mzcePGHpJV8LgX/kOwVg3RfkxjyurF4I4+1rhU++B5rjqPDL0OMUvyaD88sWm/Kyp5jf1Ywp/JNUXHzoOWon2+EGDRaNwYtTdMzGU9aOyupK+sb2VjOdrNPxyeu5TNdFIMTGgoIVJq2vo4TehA7cGsJJ1RyjPxbG7kBEEYp7iU7kpMLoDzKdKYELuEZ3lf7CioYgRe7WuP6v32gA6L34xaXx2vYL64/Ws
		6T+lmw1N+ZMoKeLvNDxszga7KZ+ItxtrtzvFEqe7lAENFqA9kves04uKSSMQifEUN5qtZ0U96Nj7Sx8/VLEHKl2IgYmRaJ3u57fu7zhajJo43STGoQx5EX+cBfrHOkCEKUV39oAml4gOFaAI2IYiA7VMDcrWzpTKvcom14Xr1nmtK+Ng+L5zeTet8+wTLaj1fufphmBcWO9bs7xHhmGcumOTQ1saLDL1Dko+2OK62u7TuG8YmFf9uEYL9KkoRLZAqx3H1Of+pXttXv5RpLU5IPMI7zVnsE8UspWrOOySOuCIH7r2ZVu4BbCciXiKI/7GqTJe2lm91dw9xwccSrHhvUcBt8p4vJJuDUxxhB87HR3x7xs8hkqY3BElHJNo+u46/Gm9wZ9qKevditz14Rp0scKN7RnD5ufl9Zf3oO/6uS3GCHgCgaxpZEqF0vpNmiTrNvD1TGD50kL//Nw2+RZ4mbmhkUcNiHldwMSng1a1eY8DNB2pR3mgxuY1rc+RApYoxWnxWgC1qrWr2m10dOkPH+lj4XvRTPnvND4n+NkKVdA1jOIDXyt2WMOp0rQ9J2a+5WmM16BZDVTrzRADxnP/O7wIQ1nI5KtjXCPZxsel7jCTiovrNdQ8dSDHy0BoUb7ciRfidt5l/YxwosmDFwspszdXtU1dtMen6mFQrxro6NyQzqZqMv9lgdvwtgbBspjrNyg/nJwkU+qe/RJaeNAyekzTDoIxXys8FGfLV67EJ0yMg84Dadtt0xjwp/TBeGOPJlM27qn7iswE9ncy4NjUEJ1HgrK6LQye
		C6HqmxqWBx1FuZfPOfsiaUWl0jnpjkoO/jdvmnZXQJ5lE/EOSZZsoO8vxGGwrC8Q8IWWtXoh1agYYdRXmrwuxJQCIYVXV6L2TWtedq69iZA8CQ9ipWn/T38rKIWPYvz5O+7wxx7T9gUWIJDXr8IPENxBjESSj50NDR7tAPN8bXhXDfTD193ZsBJljyRDU6r7P5DNmOx6YTGVbuJZH16lCyJEpWjfh+xmwYY/akzbTqkLGplMUayjtWWpPpRBJFm7oiurq8bObfGEmnc8dYzs7IFk3eqzeq6WXfVwdz0z6Ye3yquIzBXw1bQiLCS132GPz0p7Vyu2Q9XyTHoeBfa4kglhktRWO7S4maZL1yopLTmo3USaJH2bZ074aj2sbgv0aBSt9GcfK0f9S/dZ04pQBr420c6bLO7RHSepC5X1WkTh5A3UVmSOsUb8fTrzflQo49lW70mAAqQbt5utzG0LdsHvNanjqFgRyIDLpkr+fro+iFroIN3xEemr8k0ywmVpdDxbmGnGBz1tfBDnxcqZdztVkSgiivozUIt4YF9Zj2jDDztP8NTIgLtOzS3tDsXqIlsa6ZyFrm9LjlDehu23VsfqmQwGmL0pHJ91lSC0hY/StHhMsJjQi87HzbNbubFHUlDRPqvgz+fS4AZskc3jZ6Fc5yLOj2lJfFosLbs9D0e3SGPLpUKKjSlFLTAYGKLJ+vk2QIQiu0xIo3Hb4w5AscvYIybu9hO61/Dj/mwAC5Rot2++VHzucI6X7QEdvcHvae2xduWxzd8ILwU2VFuRCvJESqEtHHsg
		AfkYPP/7RQPC45tuzH61WnaUk+FRvGp7UfHjrtKJPFt9CnCeoy30emfrXsd+3kGHnIEUxmifViTYjHUKXmq8uM/faGeDLy4u+iEYlgjJNHooPMzrXHdx94S0a3sQKk2fpyv5HzlcD9j8amgqm4jDCjPVNEiaRQBBLqd0Wa/VZlNr6ThGxShiusJTnbQyaZY8aZ7W4QrtnohI1v/Z3tQZPXn1mNfr2CsuXdN6GLWXcx9mQw6kQapG1z53X3Hhm9c2ZVS/ssVOtlqWk8rS/uXKw/PzPDvoj+asHq8SCyvF7ZjwCrqTF1rg2JhPE/E3S72XKS2psEiQSI3HwVxNGY+lvnEilJWwHHRKG8Q9q1cbmrqNWn2jkK1Y7YctzlA+kQ84Af6wKqq89YnNeKNNXV7HI0sRDP4smZsq0Lww9aJUc3/K3wCBs3okOxWKSJXNX+nyTN3m2EXX8vweIDPhU7yV33Ftrpsyfs+qVZ8Y3DVSBuHk/a5lfdFNncdiVvM7E3BBffUfHJ8EcDtkPKLtTXdmsjOM4PdXFluEQeeBr8qKbHvEc2zX3Jbe1QZjL2c7eYE+4zRIwpJ6xALZgLZVwKuKui39Dwb4CP7/zcClU8ZRE9xa6NoDFA9QAl4lP5q0W9nWo7DE2t1XVhPl/KAky3GGPHowN+yvzpRNvbZHkSK6/z8TnEGDESUQjyTWGkq3ppUrmrYnUpBW+at82zRPWuS00+bps1Cd9gBgyMXZJlnOcl0og9+oQLrMdrq9rNfhKCAREJUJf7VLlqdX4HNyaaXX321fPqWXQWWD
		GQ6Ua3+v3lUIydLjqgm8xmgBkYF2B8xqup3wiP6exwxu6nBdFGvuDuHtkvjN71LK93chS64q8Uzxsonhqj45+1608fugUahl0sV/xtGI+PtzF74Ge58f3PkX83AmVJf1LUq3EOjOm2U5YPWo9SjLYpQckpIj9IWQKrqu92jPabOATU++ByQhvymLnampPcX3TlP/YueEJyRiKMTSF2yh997WW4hV4wSnFOtliNeyI99jQJHevcSsHjdTprITsjM3Dz8RERFH6lsHfXWPolh0izseHkDPiOFPLQGo5LW6Nr7wdXxQr93Txtnu78ZjQ6PFFiBvI90W31fEwbJFGz2TtmShT9TOEE0YjMPBLWM94BqJUpHJ4sgptHwVInxc/2ZOmUehWj2TLuRVgTpTOKwMQUQTkPIks8Hvwd+ansxrfhdf1N/60FA2P0UNK2VP9VdjpTLg780dcaUqZgvPbFCyJ7lGH75zDltaaIgUreYg3f15jh1ctGI9qHzsfm8ylB8KYlGcXn4JGnvck6V1Td0Xp8FtPndycKhEOj0pc7OQSl+CrrFFXGXT/lCc1av/8O2X8IcmR7twBrfzO5q2VVtHax00BScqot3pc9Cfz37Lvwso+J9a9xlTzdJ2yKj7Pgr9tQbqMWNfsZeg5Nzairrw0fad8sHSHj30eXim1SsImByEbIwF1k3HX773tS9nJam4eh0aZE+7fUSQwfISZPtbN81254rWXVvhEzINp0e8tfyZBMfSvBvcPFsCZeQLyRTRiewOYxcZVyP9oQUcXHduPDaSyCq2Mm/n
		Q13/r88CMOhk/Tk68dMbbmkQj/tcaOKc3oT9e4/N5xyVigwj1N4qCcQe1W9GqUFuI4Co8czGxsbAc7ECnD7Nwvi5Knj+FwjLdj2xCCGITLZpKLjgF/8PYxU42XWzjiUqm67Ij36ThNjZ6AN3oI29kITtScL4QqCPnt+04S8hd/x8fKGfcbpo877vs5I0PpNHJCrF3XaUhdgggKmPHNroxOWh0IgSgCTXKQPGvO1P+bya2VS4L+zK6iw+AS0JoR5/ihgkppppXYKo9pxkuaIMeam1O/SdjVK24l4Lw5iqOMJm3/spwoN2gYgS14U7IM19GfDcpifu0+OYQymWyua6Plvwe0iYpR5oHW9KGBw71FDGgxV6MtrV0tJC0U30z1gnBz3/aleUxpomOeQlhddkcMI+Jhyi2Sf6xDYIzSnqUPu0zd+ZtHwJ4hnUtCZho+5TpO47CDERe/15Ct7JDrWin+alpM8DA0UB9MjqwyOvrp0jOKG4jKGP0nT0SPwLz19RmoMCGfzf5ng0601pPtXgX/fG+JI3If7OF5q00UtqQO5+C+ID+Xe1xFb/IycBZN2hQPR/oR4/7ahMHzUhDLXtRepf+0RYJKxX8/ciVyU2til5vGLzRmf0m1246U28XiVNFfw2ukUxUMvK0o9WzG1IGTPIoUX+V9ff4Hl8fDz+m3XU3eHNoYwTyW/vr8bVJqRMPlQ+4h5hNPKFF2aXjUl+yGmPJU1How/Ll+Mh0zuICuhq1sQDb0Df1N/9eyhTJDQ9ddv4iNV7S4GrVTYRyxR3128XX878IqVc
		KIrQkDuVVSvzj6zFolz5RA4KUTDhyvZbkw3viaaChGBj5G7OLy1j7TGwonDJXD/NXcE3JklQWjwfBlyjf/DldFuajUis9ln3KpnIQyFt+ZWNFNEu3mVs1ymuA51wlH9JTaGeacH7GYeuyNYRBWTVyfTmaxbgT+xt1aOwkFBkxF9hIFQYPAwn8g73xmJ+8CLAI2c8dW760mgXWtbCE2OFevHWA5P4A22Qt7HHtylOJTdc3EowGGH9YeywbQ17DUW+UN2ENm8PMDOiYDy/Ut28YoJydwK3Y/sgYk2E69/yk0Cu1LrKJl8G8nZL5bk3OuCFePi+QL6p3txrKwqqvH6AOqHO+qyO6YS+juq34rqoBCzJN1nDt441t6TueD0lNGSElGP2MWX6FxbkdVlEkJmdru6hq9Tx2RZWKh5ZseC84TDTCiTgbE0dHSs6ouvl52inK/6p0xzBWvN0JuW/kB7rFU2Tn+qaJ9O/JyTtY+q/yw17UGfjjzNF9qXmneZVQfkeAhtYanwimPV5tZv+b2g4ITm37JOR/HoKfp43TuqeBSrOpy+xcR9dpvcb9SxJvYiU+6xSxABy0HZZ/pfXuKlJlkekj/dFSUlJ8VrWQn1E22szM6/NdtCA8kC2ShJTblxrQtubLJvI2ya6NtTxCMun/tZ5Ps+tjLjmPbT6SIXYjpiDs2FhZfyymxezlz9kIeA/xYqaY+wRrfi7/xr6HNP2VOe7Z8w2/Tux0wgUWgh/z2N3FzRm1XTjl7nabRTCsouizvi6DGEd1MxJGNVh4EHRjba99usXdyrs
		WDOTBj/FZ/sqQqtOIiVPKCop/PFxo/gxETJq8JnppoBGR6jqoTkbihItjc6VCDP+h5KuujqNu/PjEaglVm8zaRCHDhvpK6t3p1N9+13cf5gBBsR2A9Nk+HlOPLXd1JyujXTrNKv2fqS2AmWsPRlWxIAXsaS5q6b/DAgP9iBSTauhhO3lq/FXmP7GQNnF3HnPapjNbVdbJiJDDyaCdygRT3efCQclINtJlv1o8FtgfDjI33gD6yGXoKDuSWxl74n4NTJYO3aO2T/yhWv0rN+o1wF+ikdy9uezdBSA/XUHHYFGRCYfPo2wjkTyU8RkT44llwpBizgvGoFC80UY08nslzGs5q/RvsaiXff9JPoWhEr6A59aIzIuT11NXySeNf+9x0/xs5NQsUsHeKzp5MFmwjR9vCeHIfahD2o3KlcKW+9bhajREtZ2EE5wl+wIMuJ4J80C7y5a/0s4JpXzE/VnnCLbYzcjL/ogFYB9oB0cHCxpWqidI/WPgQmjRMURoB0frE4Ohod6mYbEOSCxco4qcLvVqoB4BFbRX2ujFm9q+RGC6FjNG/SMTEnNB1mlKZYRRoSSAp9Dz9zeQk2tFrI/Xl7f+DmvoFDpnyaFg4IOepQW1wNmrOY0r6N+nTK1YB9IjWU3c5C3PF/khk3DSgCR/ocb0zxi12d8zB/MA0XpvmJ2ZWw5WltcvA8E6xdsLKfW9yoEwKWrD0y0dk+Rkn41Lnm1bx0ter0JKh2Eor4QcK1ps4OT7A3NsRk7mSnNSaGSv1gzfnhw2cQTi0MqxbpuFB1f7VwtPG2f
		5vpMoBThk9TW5Jc1P/sg+Qp8T4nrMbTV1Dhc8GtpJ9+UeCCXf/Qk5n2+k89F8ktBeKjDx48YckxdWQcXVhJbvUhfNyNy3H+GUX4/OGrazGTLcJ0gWUDgXFqZamBcaX3S8ux4IolOFnv0d6gsh6f8vrjPmKhK7hB92I3fig978EckqRXz6awzX1Ngxf19dcxj8yvA89IMpFLyihsvzHQM5adA88HavKbF0F21PePre92fXkfmVj5O3PduTM6Z+6xlNZvHDQbCXlIjU2tx7u3T02dHSNyxy9+CbXyGBo8mCw7gjFviviF1Dk4cZDcVapRjnhMuXod6KLJrVdcpUvP+1C0ugjwnWuQWtKyjZajAkEwE5Fu7YbZYcdf3Gl3WsbFgk5/W1Ypi515OKj1rx7v1deOOR4qfWqg1Bmk/1NZ53EQcHx8T8XiMtf858MX6u8+it3MsfJrXVvxAK4lK9Oy6TTJxHfB17PTIGLvlV++xaLrlBsWs4HtJdK6Lnz/EQJ2xFxe75xZj/jS4KAFXbePzDG9YQIra5BC6VPmmwiWvFFCR5eM6pGh+xStrpfOCDnSPwYD+e80N11Wl9XgiAL7eGXzBSKoQ0La657i7evXteWWPiwimehdEbjIwBtXKtKRVnM7A6EZ19mQlbAMn707o3TU1NRHhTh21CJm85ax79BS6/s5yi1RWV0KLP2zVFqBDwEVveSGSUTspN9hUGcqAvyCiovotu3g6tvNc7HPhYWPTscNOvZujtsqWr0ImuRHpyycsUBBLZ6q9T1rqgxYaCTt1nztYHwWg
		lHwTf8z0BFmggy7PKOIOVRPJWKK/7hZMMo1QOgyyFWnTM6NFG5C/jA+/MGrhnV1sIchayoy/uEv9s3kcfnpUJNVCS+4VDuQNm2vXagV73mD/8PcSclg8cIsmQ+HJ4mbhiVam+b/jRYdkP3HYOzh00Orsjsvdebm7v0a6bTLMYDFI8bm52ptFFZdKGUjKBmAQv1JjjRfE1SLCIedjJrTaYrLo+KHpagz9/CJHKGCbw8G6rimAA+ajraxyOEJ3fC1ql9ryzRpBsXXJNgvrQ+U+VS/d5xSM9Z+z0Ikijp2tftpUxcA3CPAvj0zWu71Mk0/f9snKhiDMG/YrfHTWOo9OAwI9tgeKLosLVVuP78RpH/32Ti6u0OqUin6lL08EJFKpnwsNZonMrtRU49YGrX3mcvSeWbk2t3q1bFSiysgbcDq+1BIru3VomMFz8E/N/oC4uzVOxivFncZQFhhwoN35tXs0Oi8uWHkdlklGV9/GfNBvDQinjvds2yD7iA43vuNR60mKViyY8xFutcaROProFu2XVlf8wFdIognOS5xYTZ/+1qVJbtkMKyHsPgBRfR4anoXOmSim3EmhX2t1PZUC4yLkL2x0dkd08ghoLwLIb6qFMEA45nEdltYkDEfas3quX7HgSdBcY5cRyMfMprbiV58ea9h8RgRXDt79LBEKY0Yue1D/qGGNs/sc3vtnOEQHntzQ2Mg+cX1Xe2/G3bxlnSN2sDZeetLkG5GuuasqwS2815i51CMg4ZHUi8vJ3mEpE6pYmGgPy3115wlHwnvdbFCZT/cQX+3n
		57tzW3SL5oOGSjj8bGG6So707cPJHPoNPHyfrFcaMg2zoQN5Z3nJNE4mz/7TMx1hsP1an2h7s51oUryvhVRvioWiMCYaRau74zuXK7+Jbx6xCQ86cxOIPedfIKWGQasfXx7SQKs5pv56HolZMtpd7L5B+LHUBv2k2BKcfp/0AsIYCPS2hFQkL7Q+3vGasTFQVfTgZq8xqq9AbcA21O5tTLbDpIAwpTuVWJlQOMbq8/P8VPbIsci2Grgo7XLOyNwnh/MdIpUUQCtJNDmjuICDaI9UdaIgY5ROuGpC6I6zAkRRrrMOs4mb713aNnVCpN8Qh5lmQCB2EbKcFw4LIjpzxooAm5cGKY/OndV9DSZYazColnyrvXsumJTh6XWcDmDa7BwNV0PJd3Sihjt14mEpwyLyO0DDpPI4k9IS0fCqRwI6FMSf1z6l0apctfo1lU7kjrC4rn19tTVd5oaZbKkX3um/VqSUXtuIrTw3YoIeezXJWhuaejehOb0GerPA7oGwe3TkQyC1mDRPCVM9sl/QYj1yD99nXYD8KFHN/GOTwnhClBr7NDzfHoBGGDIk9Jz/JEEhq/zJoGQaXvqHtFQWWTxHW/y1JCsiDtIHvaSrvYpMBlK0rxDwBQLr6ECNmynonP+r8g0DgAvp4xMdYUtbC/pFhzZkMuvwfSo985+6nA/n10JqgWvXyU9I1W1GD0SopbcIIOTpI6VDdXKpxA57uEKyIlzWIxoYpJs/I4sojw4PWYcHBGvVnyVhkxabzS3dY6UxDG+a1tfbRz/1jtnuDX85+pWsgKxY
		Y+D1+5eHV/lEHLkmItikylU2p72jPSFi62B1dTU+4IkEzuXMPVsuFMIMKXl830rXN/YAKKNX07xEPBcUIK2npye9BQX6ze211VXjF+sdqe8cqw4tHx78fj8375ONCNSmM6ZwuIK6uzHbPAZBwo7rO3evXvRk67j4CM1OkspWXl8fii3E5N+Hj8V3UrbFK9meyuQZr6lo7hLTj3J+UQoxgb4lJX22aH90WHpmBJmM+5EzW60+/Ql+jzDL4sHUd0inZU3MZpZl67TaotLKDa/y/jxVKPQj9jvnedWjoC3/6IqoG6LRIwjErpMpTocoib3ggAVC5KMf4vwSj0AL+1swNzd3wRPw+CVJjOcl+F6TPiZVQa36BM12iFRrVzXi81AMEQbTroBD5hGrYKWQPH3E971RtasfeD58LO8XHcPb/NYEvnURnpK8sMJ4JL2filsvz3K7FikSGnRGp/7I2bzFwWP9mH/5JQlqZ3dAENSlHUIaRp6tUJn9ioolhOXTJ1a1/qH4p55Cw/X6E3vkUfHxK9EiMDQQLGXKc0rngy5s3NRUp4B4V9NMhLu7R5xiSpXHsDLxMsVn+ozykDJX1QYRxHnxT+iOKVIIT+s8B5P/valdupIiagbI69VnCUmIVvHQ68bMuoyJ43/y93VdXr0iIAVzVb3D9jFTqegYVjKNhLtTcoUUBlK0e44/39Fbi+x5Pkt4wP5Q5bWA3uLGSkCyx7ZqeLT/PSrAGvNXK4pONj8yIbdJxb6F/ok2xCnsFy3jsYgT+SYweSR0WrtPliounauR4tO1T+Yk
		/ppmFP1RgCTpW63bCapsVrGQAj0JQWFAGc9t/9qKKBHPd0Az/OHEzMcGwf6ap2ZcJ9ec82NumkNeD6kVQt0934306ZRP/CF6r7SNOUvCHSl+nHVcWOtEpdp1KQPhTZL8YzXLtZpTz8gxp+3cdg0PESX5rSUX85lkCeIzpVfmdovGdtfQccRRpoEZbpsWBboElcjT4s1b7jeTMMG3R5PTxzISW2ALA2NnaNOVL3F/8rMvUEVWkND2oc4KckfAJD13sxb9dZG6yfiLdD3CpIhFPmhrZ1QIDdoMP28diKyfdLC+//RjJwqE4roSbX8XvuTBhH4A4DYMB5fcV/RZtuhVWux5tojPuTDMxow+OtFuss0vsO8Li+buKSmXaQWHTGIMKtesQLrXMcgih6iAa+A1B/ILk7Gb4rgNLQv1hn2y/J6s5YOjFbH42vYpvWOXZMFc36T914FSnzUoFLwelf6FTskNg9Ldys3NLYA+OjWW0hOMsTXhNbbsaSLUCEpw6rrMt9ZOYqOWALA8JKDC7u55WaFKbu6OPlfw8cppAt3gSxpXcJfS8dHfRcy8N8Chv8r/mIyTsC6Z+CNT3WyUzNMs5xGdiyc59mb5KEZxup2aZpDsCMGs5vdrq0AD+h9bi28WLnhQq7Qye6vHbDejHluTHm28O54UBBzQPvbE8OObyxdF/NoYL5uYXEcwN0ukQb7boYHFnt7HV28v7T6Cur9o51vZq6J9sKacilD5LZylQ24uwDq6T/l47mtFcdX6Jp8datUZzOi9tMp9ccxBl14sFXMqxqxmqMkg
		H3VhlvD4B53Ro/EI65GKz27xFr9kKHLrvh2TgnMgxgH3j6pR1WSm3Nh3y/ngF4BIJ+vlo9dujGcce5IL+9jS9KAIMgBSxUzdVzq2/DKnsaHhakON0olXhcLQ6TZsKkw1d1zh8XfYzMV9TG/a22NNHDPAxpulY9tVcaHd/lTbuS9ybhCfYSFOV57oYJ9wvtzWcUYm/Yz4C8vYeb8PBN08mrtDvMyvRM1fE31tJTunZLtLrzsgmWUKy5VFr8EFFSRQUhz1vNd6PvN+NARjLAfhWR13CDbkfsG55GtzC4LU8JnHDYtLeiR8AX9ra1tKPtjCRsPtSeN2DBYM+OGJPrK6oTjGhBH+bKqcrivfn9sdc4wGOlaK1smk3kQ25qeP7oB4fMm57WhyYweZHCf40IaZar4K9NHS0JgumZsjPnKA38Sc38m79zzvgZa/KKUOeeUxun/iy/2IRHxXp8gOKvj18t8joy+KnPJRReGkRXwpGoNNarZTClT10Z7tqEi2OA4FtXlEX0s3fcfltHbjJMy5E/XoGjO1Oa0tZupNOE3T1YQdWYMxfCPO/3z7EqXdJqpSOsGlCQgcpO9fYT+KbKM/3izjQldXZmZeI+I0h7qkCF4NB/PZImqVTODRvte6I+FODJS4pp/QyaRzKxk7UnHkZJHfKVeOY3qvd8aaX3G7viKQJKcsmF54QP879i2C02+fSWb2PVzthRF+MvFvErQ/LCIwMEg0EGKJdO6cBtDiMkFW5ROxTJjHPAxzh6/DXMr2WSUuSuo8zsH53HKvv/SUQ+pTU4vxpsIR
		/KEFgyQud+GSuQogZMfA6vFzqG/hg8RfuoCw8TRDt0Ch7QrxxXcGHkmKuRa+Ysznl5IREC6C8AOszzG38z8wqzkl6VAECRSLjtpJ/o4GvdYiKIf8/pX/INNtFfjgSQvlJ6CDq3gk5X5ntbMSyrQC65PFDKqUlZeTTllJ57ccwTvVRHRSq4VrrHCKSiZwNefGIop7Xlf/8/2w5e5KLewtLet27BouyjdGjsCJCsbZfjFJCGegTRM2pxuV8UuYzZsgJRBVIdkZaRJuInx9B1En+rIAo1LX1suoTAjy7QWYRaTNkwIZBZrpD+JUDMAuwdkeviVgfgEfr6DIR7v9+uvdZKB13LbrrGDYCO+4I4gqD7dagyfv/OTkpAsjiKOJUDSpa1hUBffWf1YQMQaAads1Mv1HNXLL+hLGDP6Hn3ZSMkmpmpmmM5K5u2MuiaOag0NokBL/mZU3KaVdAKVD70b5+XNxUSjPiFHGdwmqmY9JsOACF69QdlqPJ/nBORJlpUKBnde8z0rT/6VATZtXxuOVUnCc6vfky8a+lzsFZS8vD/R27J1vsicR9C7DYR9hr9i7jn1W/d67fjGFI9bX1ycgoS87FLFzPGkkC37TwA8Y5S3vrbMrl9DLMMmSfv12vgfnfqQLRLLdf0FcEQj9HPv9y3zlYlpdBE5zolbA1799RMuiHCXR/6B6iUTTdSV2eM6Q14SvloM6yul2P13qYQtOAIiSl2L+SJqoJfjlmymYRmJFhJYPl7UR6Tu894XfK9axDPm+zu5suUSBYvnrCB63sI8nIkBkQEQ/
		wZQtrCJwV+8pPe9eUq8KLu8yyly6ExWL5Qi978QrIsZP47OUz1kF6Q6U59XfQma5eD2+uJjTh+BmfC1nvfCo81yWDOjPFrW9TjqKLe0qm+B6LQn7mBdS3ZK12+H3e5JyIoSUlJQNEFQ2dzKH43YvCsSWxsGmkVy5rYulEDBoycIVarNYsFemYfNRbShNrj/3g72hpd7Xna39/oImyklubmjsYquBR2QuwCBBIJwpj96A4++B30ZGRpJw1bbPKPcox9qf5Np4OHSYLkipv0SqGh0pEptl7rMOmn0p11ehNo/bJ0vzHfg8Ugha1NoVIMRIrTaILyPEj2V/JrMp7vP5tSuGH04cpibW/E5CSoRCzFZgknwOGx+3w1x32D+H6Nh8rFneI/qTKezX6SHTFWef/qxaNOR1ONx0TjOjUCh8BxuS15eiuY14ujvT9a1lIEO3A1kyZn+SAHE8sP/IVw2YVFR5LiB9kLi8YIUaXAqYHYSQ1yV4lladoi01L1+3871AVFKV89Z2EMWs0fdI6OWyiRd0eNwrc7N5Bv/IFVLT60R9Z/Dna2SFTqUcX5T72e6qxnH0SE+Pe6c18cC/WhgNv2inToYCrhOI/3RM7Py+cIC9TBza/gGmXu444v86VLskGhGkuEyQxufD+gJXPVP6gjK/9pI1gehh52OMfG91Kn65yrzft5LYhOPCp1P/s0UPkTDTGUQQD8dHO7t0zpldrN1G+PdVrVsJ/PtsxD+Is4IYiVS1P3joM+hGZjpLuL2707hNk9FT47V2fj6Ol5WKUFIfoBRSpyyU
		MBrZRZP6pf0iC40u+ds0cf12litMEl1tckwYJttc9dBILeZEvEt8LhEAdrE269UNuqwnTpT9xufx6PP+KoUgf8UkkDZlofHjYAOxZT+NPqIGC+tO374b1Yy9Yb+4/oymPZ7W9kutDBO/fD5HFXKem/L/gM/zX0zCHjNyRUpaWlrSUolieFPAUNmzU1RxmwXz6GqRpQzNurAepBZhFgW7X79n30vb/gz05JOW7f5eFC0cC6kqrjgPdPvx++i9T2lg/D4+hfOOsvKz0X8SiQf6sNPEZtLpL/tSHKv0Eau3WcBmWjHrexP/pxxorH8fsYHnR5v7Ak/645HhuzJmY+6BaKahp/0GNSpmviLNbJCU/Vj/Xsr3lTQRdrrI3jpXl3cONjCqQDsvz3++J1mOW+7w4n7N5LX99e0d9xv1XKDGHe94LoKzfxtYl03kdiQyvsh+naa2pKK3Ki6VkNz5QblEiCN99+c50Yv8vjR1N0RkS48BDFKzr3yW/nySO332WTKkqYw3bB92AgBBKRGLA0YEScKoV+7FALM81B9I7zhPhZMtT5Oo2XHyhtJMZ5VKqUe9+VgGOdh8pwB7gW+jKwlw8ArnElwuhjh1LO9/Yl6XNP/dVj1qDrWAbShSmoy+1ife7XMFOMQnmC9CUCqPxvOUzaUFKPgN3VNKh4Mouobm7s/oaMV8Vl67c1szxb2XH7xThaqINe4/8Tl86tyY55aCfdcz8MBQ5DF30iSBkWwOOPIyaGYV7p4+rGnsHQmSFfO6FtlSpEV2fS8s3G7ODFgGmp+40RXSX9/l
		vRItcklSRDwLpSrBtQzBXIKQpor3Xxb4ypifTZXmdB71w17gNn4sV5GyPVPA/GL1J5mWIDTQWilb1SGBkG1I9x1beSO4JUWQfzPhve31eoIY0GKaKWexCx85xhSrMnwWLV8tc/eFjjGyf0SfVUm11U7u4s2rAUlCxkrx9cdemE+O+wspIYlD5pq5dnX5zOc4S9x0Jy2Ve7jh9jNz9pwM2kZSkFk9+VLLQTmD5c9OhEFCb4RKyEEpPgtnFNAxJoQx+z6zmjpGca+iLA+vSrofg0CowsJhPwZuy9y+pDEz4SORtmd1UnCkpoGweSJwAi82SX5TS2q3qfHQWyQks4f9bMu0XZCx7FeQpJNmqn7ofmls4oqBa0W55zK2zIBpzjMif/+lpvCqNxVaeTdJ2ZHZkd2wrzkowE79+Zs6YrcLx+dovedYWYtcU2KCVIwkh7GMx+AOn4x9skVGdHQ1Y26ThORuoVvy5OkJT892ZGIKVoyXo8QvezO+BH2Vnjr/nAPOtxq7ez9OLDu4gjJ48CkBjR8VnJ/AyhUsacUXpDGDOstNx/xAmtKSDfPvUPlim1Znv4SKqxTxPp+Bl5fX/t2+eYwHFTXkJ6qyaHLcamKZlA2JpfrvNElTBWC8+r00TcU33bP1vVNGtHYfvsweIJHuPCYCv5kca4uwQXxl/ETZ8BjjVc6rmp3ruIXE0t0uC6ya5mWD4kg8Lqx0GADliiNpT/J4nmH+7tgGytUc6vThWtTa6vlGk/ULFZbqT16laURTrJsZVNN0E7BQwlmK13GM/r/PDQHYJUmU
		h3xt67DIOda0SSuy7flQJzJvlTpLQMnz5ydhF4SXhSJGRXRxM9pjSUxVOu3DCQcV8o5yaJFtGiGt5uLQg1v7n+nTF9RFXBcUoG/qWQEzg+RHHJ/cRylBgR+ajpFkOeJLbdOKLPsvJhy1M00ZYSUOp6P5xn2UBzzwaZ4sRr/7LLebv9v+fErT9RUL1NMXoEO1zE1vzF6Byxb46UhXQ4OHCK7SpHwZ64cdIsOdnEpICWAOZXTjyb6rQqjvDJD4qF0ZpBGQj9GXKTQTF8nqWWkNmno/g7fkze5RLwWgld1c6zg/8cJOWU0LyPaezwzNl5ddXjPvESovmWQYfQ2nsEOPRf0rAaKSNf1Rkvm+P1ngUOk4jOX+jzKiauGhyftp/zD0Abfj1Y6TxseOgC84G8hW17ChDzuFoOfHnUGymsfUuxmq8ZQHY1+3NwXJXrMY2Dw9R7zi//VZgBM0U0GkyRdMxk9DBWlDg6NWKj6CLTc/XN43X89snL/ZG3mDqvQasQ6uMebNj0uEpNn3xRV8GRz7wTkS5msUTj5cv1JfgrI+pPDU8QSVu0p0UKYr9lN8+UIX45OxtAaLbrXgw8BtxyOCLmgRNAbO6yf+eIckwJZeyh2R6lXp1kaaw/HQgNjzZQU5MA458CHd9kJ7koMpHTuiLuV2rcedMJa1s/bxJ6tR2PfVxzaX08mQk5PBT5xJqF3Wzxc1aDfIYtX+mBMslEhWtOLteN3Yz7VdXg/QKy8V5wKvd7AJpJxkkxmM92LLGs7OSLUkH+PJ5ikeTe66+g1GslOZKGIoz3re
		XZHxGJHlkBKkvfXHfHF6gXM7VTe92+UrqXY2+6EVrVudUxFHHA3OwAJTxfjJDRplL6/oKzRnjqeq+L1T4Pg8MkFO93S6+jIvdEGwregODQHL6Du8DTWXpKyOLMo27VQEe0yk/twJmNxfQWzH03+v63H+IAFsQt/TOS44O1NL/zw/WyW1CYK3gl4Ep+9W9amLQu8HsWdZERg91pUy0CI8PqcGr5qIdDqdkCWfSiD6dyBEFn0lnoJbn0xsbraOtAXDs9xOMkmO2ixG2yr7o/AGDa4JEE3Dk2sLLJkUgptUGQ8UGC1tmRyCf/2qJfhrkPSz8xthGmIwIkLcOit9RLyAJ95JDdtCkqXeXFWq38ldB1RXPkM36f2vLxMdPLsPd6cR9uPndTU7LbvLblk0XqiiDNDJr9czXeplTJhSsKG4gIdrvsb6ehHz5B+C/SZ2HZbPG+MrTSG9nmNOBGSfzHP8zxyusNaexZ9GdF5uvULkQ4Qcv5q/De3+ysFW3npWaKm1MogIPxHzPpRjUPJJRi9T2q2rMPSjEjF6c7XBAR6Vi46UlcNB3l2+ybZfhAYYEj7EinQIk30ZT4KMphHmIjyuH2G97LwMXtzuklkPRNiYaS+zzT0IeFxLqr++RO6ZX10L0I35+OQojP+BIO6ZMwAhyBxEmDbh+g6c57yj2eURz3afbt9jkjGR0xnDpZ9ho6dBfeecvhvwd5CFvyOhu5raecOF5F1pGOr80+l4lPb1IQXp00x29t990K2v32mSFg7kbTRXOxvdBIuiTGqk+j6vHOi3/8QNvY+/
		fSQ0+xYb0dBaKNxy/AUX8rnokkGT/zlgNwD/0w2sm4ucRebNogZddoul3OgIGx2BE9JZ8554UiLSaofEido0dVF+Qlrz73fWU2s8kfAsUb83EIue9oKR4JNCYRUkdUbKOG21jcam2bcd92fXCsZaOwJNkqrfHMqknfvD99M7zzMLyx2vgiYvxo6wRiMrHSScPgj1upMNlqKAcPX8T9d7rGeurV9DK69CL0js2WX3s1EGDwMgLEXEiLd9veWN/ldPWKPPUhAzj8gde5hsHvJ5LNSkdj/sayGdU3+qX1ESgYIM5xyIykFoUBNigSKHBZLAMXS/vslSe0xUr2F6BtfaJfjm75El8WlUycI/Fp9/Vak3Uk92zXSKkI016pMflNlPh+9NKymI7ahJd6q0WiqFbfnGxaRNcH2lDaIBibuOL6x5X4vCfy+foJ3iyLX9noxMdBVA69L2nIpxdNDzw0c+4cocfB2sWe+7yv/sMfXLT0j1LGVPBNjvcz22hpi90KA7pMDvcfSCCBpXQ3InhnPpESn7z6HEyjfeS10GndvDLIR0xujriNM+ivi4coLH4e9av5c+oPKSfT8AVQjgBl+o/uS3AMwkqOM30dNzPNMSBM1ekHxkD8T7vRSq7a/54+6ZLTFdeCntih4UT1GjV2FINN/R0lIGjTI4Y0IkmfZhZTF4+PGMsmmwB1Zg0nr7vM2z/6DRD68ZpDAAg2ts6c8//DSxFQqxtAx93Ccf5Xhe2ED5c5EIe/ISfjHYE4bNz9/5iBVRaGDKAapI+V2FNgD6AoSHoHAGwvLj
		XtTvWsQDvKvRv3bRfu2jwqdAi/0VbMOV2VtbVKeYGOg1eB7llUB7CSeITdgTmaIn6qjnathiW61F+k4E0sb8HEkOuk4FYv0+zhwkfl46BV+Yfv6XtXOcobwu64/SSxhankteZezn7QX3Zgh8R8MsdK1XYQOQc/2mfQVaSeBsdvIQGZgNf1UcjxFf2wDUx/GMKLbx7hWfwQrZElasTXbZB4IGelroE0ciqfpXrHs6cHzjVOOEFFOV9/yPATv2+LLs9AkzPQ08uaPtDzF7xNNq8lfR0LuZvK46mX+eND0wyChaf6+4kIts3V0iIPVNT3/8CmZNfyaZa2ne64jaH2UXly6Q0Uq6SqE4V7Ie+iHI8mwueL72JkM2beKDXjy1yylPAwvczKeuUz7ozbTPxpia67hS1Bsv9mT1tobByIoq5wIhVJbnjjOObL1HbMp3hpKupbGaPJC48MuUFWZL6VcRPQqjLI7tuVXXCuL+E0Ow2s9xOtDvuc9W1EJK1jUVw4fzvTixEtOCRWDw7KYJu6D36QcMYo7n3t5etk1r+ICENWpP2h6lld7FKO7jcBNR9VMzrD5tQl32Df4qmom63oVPG+hnZB7mpWtcuNJuSqT6R2oQDHYeAMXlNP5XQsRXSEGwQ9R+ik07acwuuO4S3Sio/bd7nCQNeP+rlgdlhfMMkSLgh9u3SjDeHuEsWB3lg5nDD7P1Pb/nGsH3l3Kiv1AkKgG8X/FStFi6DCa/8B9zj/tEp3v5NZRFWNyRh7y/doJe/AIn5KnITTF8qxQIhNqjeZ3Dce6pe8FJ
		pW5/8YiS//qnX7VQ3GD+p/zKBVcCR2/oyo9KEA00ulULAtkyDbiv/2+Z+wq9u6wXC7LicbE6nlp3L5hUaYzEPKO8qVz8iVu8wu3iaWt7R6kjeDxe5KY7t0CBcZ/fsUwJGo6Qgm0InouVhOMX8egSgnDI/EykppPF/X+7J5lRf/o1yc9eivKhCa4XO0UUzfb13lMMN5VYQMzoke79ynlrbA1avu6UuP/dUcPoKh248aRPpMx1JdkkjhkO/bfNZ4pthjN3mswSMOibIfqXf23gd7xirVj+leS0IGuUOFwnbf4JubtcyZrp/YmT4akZwnXKhKkeCEeVP3KodI/SNhomsAmvRMmiuNNRuSoowYntRU5K/XdH13VGZCRcNNAmjG/y9dTzcm3kWhrw8+5UAjitClCiiXWtj5lMz8Jex6xoZnXyd5yfPbecSKS7oUbbcQag9l/A6a4bW4tYEI7fAvWKzhsl27RHpoEbG3fGUS4XKU+L9y/54vrhRpKagEcEghtJMWz2gS0ri9ZJ4EUOjtLHQiCtKPIa6O+f3Lt+ncFbVUTOIC3lCWVz+qRKCZWbstmfM63GP73yeO9Fg/6QehZO8pc3QAwHEZNPgg3zKjWTYuZVxAU8U10tg8dBi0my8LMzeSSs24VMrlnubBmDduXNdpmvOMFjy9Vs1X0RaI0vsxfxubnx+ZdfK+o9iOlWKkFW9BOViIQYWRDlKy5MqTD9l3wNYR82rN/gBGnAydR5kd+Ag/AqE8Ao4Gg8gWiWaA1wFnPIgWbEJu82XIXICewcjZYvFbX8a4/S
		HgYT4XOe059vlcDRZCKIaXwOF+C2F5KaUT3AlJlW+fzUWywQp8yFvl/aoglJi81/xhI56B6xZccPQH/1QylDtdD4/YiC3crIrwbxPxnWKhvrHeVv+ZdC/PKoCzPGX4qePAw+rjcU1W0lzAX8+TmETzZs4U5fIk7Mjh8rBBrNfvppaM+ZftuSddiAjonxkynLT14eL5eZw5Zw0sgSzWzSXfHXnjTM8QxNle8s9KCVr0qd+a3OGFoI7tKCXQYFWQDtX0G+iukeXwR2kQc/VCi9KA7bKQ9bqxjSJTbNoaQY3rG5Y4DSSCnzygdm3eNTK4TnIXeMA9uTEscR/3MIg7nJF97BH8+5a3vBUxg2AQjIyQgCPGzWpzH04ihBfJdIP7Fz0N6Dhl4UtA+utEZabviMfg2N+jbxgTg982+SBu6ZbJE0bWlCmYvL3Kz4DPmPkj30gb3YWKNUmg6wfjUaZ79/gIUmNb4hIdmRhDOm33JR67Sy0l1/kdT43EuW8hPQ6S5QJCoGyfJGKkMriIa2QqOHf8VvXq2Rv3pVjerMF0T8+KEO1zx1IOeCtv/iWE1pliVxl/DK/jfjles0SZGUqzjkTf0cX6RFy574wv55+MvnwPPXiHDnm8znXHw7yEFDUe8YxhQh2UmHQEfXgfFniYKbPuVotM7vH64GiMmhRrQWf9I0h6WKNMYiKd3vw30psNHCqxFwuvwOwD+omkVEfmngZlG0L7mTxQ/Q2sN8k8UKZ6hAMNlSIbs76Fbmh1ZGMXePnIfptpjDn73m8yAUVW/uHktzv5hrniOv
		tGhufNpAyT+jSrvfJ66K9lt/ezxv6VrpFB1YCA69VLRO5aGzvL88JXg+0/BSV2niLeHECg3c2rUDfQGBhvGkuQn7sy0EYJyvoC2C0mIieycHIq8q+dMm4hQkq4YOxfa5jii5MukMxiNmMoMMPwqFe1QlGu/Lxwkr7g4RyvDEoAz6Er3ESa+c0yMZNcSnEPbhyIlyDJgL+kzDpevJjfol5hGhADN8eI5JXMaXybJqj+rvxOGJCFbtintSOw6v5SuyK+BgSjKphLlwS7l065trmXh0bS2h46MiN4sQEngOtL3pBbhGz4kP/zKE5ZGGgTLMasZvZVcT+5eLgGOg2Ym2nH3Rk/QWLZW0xqPHoljCwtJ2CEAM6Ca1UVUoApbdYbYvPKsu5RtTok0z19xGWB6KoAl6mL9JyUQLB5qOCKpUna7blEWUK8OLoM6mQ99iq1XAecFntlBQDeMzCDXCxilvrHD973Avd+ClWW4+pXGZzEBeoOyoKBU7F/kPoS6iZB3teOs36tJ4gmTuntkgXbLd+M/tstiYYmZCA/64Ef0bPojW+k8De1lwzsiSW6L005mfagCiNtA9EdVBARgYOg2bDojfp92jL15EX7/D/PB1j0w78Ju6HPd+FDlDI01CH7DyO8iySEr3rkdRyFSoV9OR0ZYYpwb+nKfY/Qp32Vpo8I4T86iFFuXLD2bcs2JogaA8EwIorkb/lB9R+JzDMBBnr1JfR0v7bcrEByWZ/dHPbYrFApSSkY4o/lyxPFgX3MA8lLYTrSGnLsSJ7zwAcyNy2gqFJ1KmfbH3
		4gz+wnqqrgAAq6hpIeqUryDy1BeZBa1AMSSW/Tl6U/EywoUgqJn3Kwk9LSER89zYC7WX+zaNg2BsQ211wmSS2jzP0BkTc6HeO/QEtmcU9qDof2Mzgr0lGi+2uX6MPJiKXa+SBD/0DPW1Wp1qoTuOULniv62G5CJBsRnGDOAu4rE0Gkmw6PngrWIXTCDSgvX9M63M5+kMNYd+gyHcaVx6DaZVZ+L9odWk71lzqpsntC6/3aOHFQ9rGjF0um1iHqX7kEBx0YgbXGmEuA7FTy9JpciHzUmnZzKrRtHXFBuz8tYlcIatxPLszzjc33xxP9u9BelDzPiOVGqmn0OVeOKmn9EE26ddDpXjdanikPMWtJQ1eefrdQXxIe23KlQk5bbQTzV6GTbjiCSQWiKBCAnutwZmUWni6lRhAMn5Avu9YbLOm2/0KIeB0xsrFuq52BW0R5VmkPt5CGQWBcVU/RY3FP2ohPb9XEmBlyj93VKfKLz5S9GL9/D2vmWmTolPEA++etVcYjh2BF0RzlTHXMIGCxxcVvI8Zqop1jugRCbICo5GxNn7bk1N+1Zv9wvjj4eQL3/hXdaBZmYu0k494RD3gLDIUQEWL0bWqg2VgY0hpzhNLgEYqDv1wRKRcBztO2LU91uZizWwHBHekZ/PHIkkkMm44vLS22WzcZLYjdZ1NYDO5ylDEOnwYgKnaTNlKedT7aKNyF4TUGhVqqL+A4ZMD+xbrEhQhLKLUjASKKrinmEd8oTotPGBslJ2oDCHXpqWHXBNs6aZcZTORZO2Om0p81yhVxULmPVK
		KnYWeULnMooTasNMWoZ15Mb+9zvIzOwoWhB1xiJbqA645YitmoxgGFvGRDf1hTttG7b+pPt9fd0vBEKAzpNsl8pSGmRiW79rigoftOHP09g8UJYNc3lzVxxpu5hdpeGu8RkM2wo3j1Eu/zwaAgyAaVLMH+Iv94HcYJIzlPHg3W3K8hKZ7MiNuNAYPQ4Xo/40zdB+KIZEFt+Ww+A0Iy8n7TjJTbkDTssTWPz+g0ydAYANC1C6ZObZ4VaSaUGIRDBz8jsWszeVYBDaL+MAummDN/RcjNIYG2OhXc3KDXs4uzWPsZeyvKSDupPOfr871tzDLnABWRplM1qyw5mAP/zy3p/KQjGva1EMNDEG6rNazLbASJCleIzDVuaOlewjfb+FRx1LXoPg7ES5z5KFfZQCFnT/eUMjuC02EQK56Ovxx9Eh9ykrV+SiGgRBWm9VZvxwX9D4hd3TqiO+nsxjKZwL/m0NtCIXZnlfReuUEQ5UZTLaqO83kl/QvyvEE6VPcNHNi5oK/fDPzVdOm+DMRuZ+zx13kDTBzZUzxogboXBWjZjn80HGGP0jXap3t/uXu40Z7bepE5yJUqmKL1VF8ht18Xw0Iex85ObM6nGMaUYiZe28v/LXDfM5z6ef9e0QQcO4KFSEGntg9SizN3dIp4QzldyZpsbNH9uYlaq4gFWIFURDntOCFRdLqRTCiB9yAW7oUjaqzfMuqsL6q3i2ht6iqdBge14GOD/gNkPdenEgaggGJonaUKkNk9Z+LGT1eYF3DHD6Lfyemr6NoqHqT/TOgihdAIsT6jrJ
		fkdyp9YgoBzvuuKntDvEX1y7pQaD1E6bdQqAA/DOosP0s1uOaQXzILSEAOY+ggbAdux0SW+NQbGya9jZbHEk1S2B4Qm0+sAQjQYpOB0LG/PacW6Ed7RNm9cQ2wq9/LiIQHj85Cwjuj6jbegIRJklJHLasb7mt+IDEqOCONhH0/pdxG4hHguRACg6fSLOfLCjH0s4s+zchuOn0Ki1MtlH5J/WwEhlNxk1et0+5B5tDzuYER73QHpNwZNJNw8ZDpnIC/MQ523z2NHIpx3N76RPKUA0e3uEDeKLY731s4yPheS9nWps1hS54S+qGyPBleeu4ZtqFdjWTHLgJbemR9wQRHbkAUIxH4OqcoKgaick06gJruGuae7Bne8YdE8ypEqJrZ3JnNgowpKXi9gTodf88dU/IE33myy3cX+XMd0mb2WcxoZAYkTSTnlmqIcYCk6vEWhGtvnGl4WIQr7C0NvyM+l9RvZ6P5LQ934xM1krR/L9r2tdDIMO7kTzJsczOmLIdMKKg6l88ws7b+e9WrFm52GSBSc+uxokGe6Y75/pQDkJbzwA/dcS06lLd2Ue29U4wuCyvH9OJDhraQ6wFo6Q+KfZIWRS6ilRucj1F8Xth1xNNa3ScauWRRdjoSAtDrFmu0N+lvkYWE6Jb5KMHuPtdsrOqOJuCptW1mLOiAZAl7DDA0JsUXusJPpUemmYqtqMZrW8y3g9IvYE1FRz26eIL3mZkSa+PBrFFZvjEIN+FjHjdYlLVAWk4wYXZOyf7wrObn/A+bKXG8twpWoFS/1ChT7qQTz30mJV
		52c8MUFs/OnWZ3naME0Pn1TNhCod8PyEV5K/4E5MB/oPOOKWR1GdrrV/XbU1dtC/UtMpY/WIZVYI1s/+JUXTdmXzzWqdQWvoTaVHPIivqBb3r4a8h1SpMdOVZCmrnVpV27BmFqO8avRATpL2V7hXt5Z8ZvS9Zv9nAkc9kkjH4bWZPg8NZY/tMjmGKT6EShmPIUySaEYlJTN0cJop8aeM2bUimIBzBvJrvDxNDPnECFfmXFXED8O3cIz4db7wX38OkhmMDB5pggcDuQScqcHw1HRRtbK5UtYu+1rzoPqdEsRB95xwZEUNt0dtRj7JMZ/yfIG4z935JXgumvJBtGRaETxEFAPs7zZyJuSkO7XeDX/EDYZdtuofdBIbVoJASTm85w89NNIvcjLwtvOQnctBr39ZF+Aianac/gzBimkwdhVHZlHaZfJsGxhwpD49NrvzCrDiykwo+VyGcH5zYcgKzW6pn4nwlJGKCwGrI4AkcDLUTYmz3pIzG8wyT6lqMjzoxRbwwdHz4FPu0WYyroduxdHJUa9PwDwsb9CjZ2hIrjajssuuIiB5KonJyYNFtywfcLuNgT6zQQ9ONoE67yo/OE1VsK/Br1VxnoMBhUnXjYvw5t+jiTlf58fRD9sjiUgf934V5tPSrBHig2TfKtTHBDZEQqx9L5+QO+2FZGrAgpex+OFGuK+3s1xZ9NEFkalGBuWQNhlu4w7xcZUVk/sL7fR4joY/aiPD1vurfzcd6KCsFPH9eIW25/Tl42+1LoIXkmT0JHvG+PoHERLPtiCVFZao/stCWII2
		TIN319RgqlGY+J6YGuoA7EXt87doM7PBc8ZJWvqFZjWMlT/T/A0CCDbEtL63sWbJOoHJJl26cmgtHTJ0RXrjICx5yjWtFjkMxc54zlNp73F/NZr2HUQnBQIHZAXPLaKA4gaDi6Og9sf51Z75nTm/mOlpqN9Bhyj9ODZ/sdLsSO5TPhnAh+cXCJ61EzQFHXUwG8eSkYJgZKhmAucmxWWHmtkEJIisHX+6aeZfbmUrWTP5i1xN5MtQBA2hTsuxHtinZ+rOFLaewT0RuVifSZf3geMmEVBL3q1roVE2E6xLFdW9rn0IC3+u1bF+ZyEUbika1aWtxcZJbsasb2fmzwIepun2PiOK/f0aLn+W5Oa/+KMWLJGjbPGpekVU5FT7E1LR5us80OPNZLZQYP66Yjj3aCTGJz/1ESMHoUFeZTN/pR88kWLDv5cvGBYwzIqB3Hq8xdV7npsYdPr1yStlQt0ZVtXkSSGCMFRYlK87V/filHi4AWDBof4DSVvs63ux8OBmVl282H1XF+x/Tzp24+bdRVzgGIjwefc4SQnw485eFgem3RPFtB6rHbecEBqoHqjtrxIgqtIQKu/W26aGBizYEFf8sNUGYrXrkDvqaBrmcNd9fAga5fybG2B/dM+vXwI2i6We+Bdmn7Q1K5MxiHDXdgbP8A2lt1RlZGRQu3kCc7I44z4SVsUJDf5bnyC+krX3fHsTnRGoGe49454hICzUt/ZktHam82dPaySJQNCufX8o+4vCu9nxm7OINQ3rAJ63/fBISAASugMQYKX3VInZb5aeykw8vpK/
		QCTjzmSIRn3vfcpTLKSDyQPz7XIvL+HSrS4jTFPmyuTELB/o8i+jXligga9ckFpfj/ypCv65etMEjhJf8XtPufd7lZxsJvd30gzPt9zVp+IOFYp3zHuo/6Lx0ZWK6WPH3utp6hbvx1E3mWcwXnqsWNAr8SNO8h+1RZIf9kjRKAxdFJwmH4J42PgqS++2JvjJBb9D0f/wAa1yzl32GC/21bRgkWStCZMWCgjs6nh2EyD2lgYKsnxJ17Lmjj6alvSjVuXy6OExOdozQGBm2U5IOQHr658IsX0h5xkiYIgSjo4MmBWg5gWmrS0Y3BnNizbdVhu1XaMPx969emsw74Pl2d9F8BJR77Q/uGryWWf39J0YDXbKBL40w/3VyfNhH67TZ//OPdakxEoldS0roV532esYqI99fyRBMUMg/NAWygb22xFdYO2Y0VP9SPSk50L9qSjm1Yn/8XybsiZy52Ofe1YJ1TBSyJ8YMa6fC76KvwBRU1OR2vyzci/6Xh7Oicmwv8WjTBlwvbrwe/mmWmf46t/DaVO9BTy6CI6imyajpy2kNqr9+K3Ui4YoguHcNtQwsYeITqn5TEjRgDvFaFqu1LjxHv00dZGU6wbj8uDk89NvQigoGaf5P+HBxRUsDMGuDnzMYoG++3nDjSfd4hnajc/v4RX4rIA0uMZDv5g17dAf/ckeDSccnz4dFLTFQzgsln8bJWuvTIcfu2/JbIl9W7Mht3UvJtq4mz65BD9FQ/efd8+4k4wLMD2tFBOo9dpFEHt6AXIRwJitnajRLWwF0QKdc4B4GAWY
		576nh04i+bd2ldln4yV+NfP2J3cGNXSfiiaonnr52k5I98a+tBNsqU2nntsPzj/4rj40VjFkk4obWwp9sRzvp9ciPUp/Av3gFGG0JqSzkD0WevCbZHw+OjoysvC/phFbs7VP+6tnr1dDqxrU/nQfEhO4lRaytIa4QR+H0hgfyoB9a04JHf8TIOxIuQ//hJ6Uomyh5yYhabIzy5c2wUUeVzwAb6urrGQLuL6ZEGSlUdaAb4+sIMM6TpwIPiUdf4HXXa8ssd8uHYdMItx6xNVkLYC5uIuudlf9b9eJnifPaCjz1q9g979sRkc+gdpGS8DQLjF0RDQQxOKhrot/QU5vV4SxDLL1ibYvK8uKABUXt+egc2XNTeYBf6nVywq1Cumsl9gYOYN49s9a+8HvPyrtnW7w8jAIPFGcWTG8tsJQTtwTJhu1R6aXYhMbMJHznLGhwv22nzLoQcRJonoPJynRvBB8XqMjdneLveTl5HeZHBKQHHKL0YMw3VM0EI764/So+kDkdI/fndzbSCXlLgNWwZk5UuvqkK9DGt4aj/CdDCSbVZd1ksEDa5hbImd4x7DTydRQf9yYa44ADsyqtRzPmIlYxz9517gb4KrY2cqkFdA/rrDETjB0gGBMBx6YbGZwgXQbQHkXu4524hk4QKe26G+QPT3XmA0n1a4Si3gUGTB7n8C1YRa6xsaBE2cb8c+fjxfqionEHVant0HDftn89bPB62ZAr2CpRsf6wyE9Ot/ZVbb95yWeBwfuej9tNW7sTHs/1Y3kaW82NtbTcXoAQ9LH0ysQeO2w
		r9Y1eH21OskeE1TBlWnJLIGzTB72h4DWq7GpyeT08CTbqb6dvPvq7msSKbiWrnCZI4bre/8as721J+qyeCipcYDzSdCHk8nIz84e//VZgJJtExOD+csiFT7WNtWXVSDnQvG3CCVpx9u1EmbE6yE4C56Moq0X2Wi+l881l4SI1a+Hwt3OKJIIGOg2VmXOr9RM2t6E5SKCcFucak9U9B/lHIlidV9DQcdXykZrKp8cpwVZ7VbRC/C67aT/NDRdkmN3Qfdv83Hu2IKhTARPZwqj6Y42znhsJ5UOy3tfEkRkwm2UaT1UjYuQJOVRvAc8JT8FFJCdnHh9HEAc4Ro+vBNso4Ta8HYEoc8jnX8EUfrur+zCY+z1Yp1xmVXkZljEQHFYm1wMRq+hnbHwAh0MtauwvtrWbOSV684urYI+3B5pEDve+oq5ZrP5dzScvZbCarevLNxJOLuQsEOs0t4IazbFJM/ZtlJpEAiYtkZBhaA31K5zNa2x8Iy6ijuJ87CtH7KUf4QdMbsx1scu4RbYKfW6kUPacV96Z7FAM/IbrkE3iK6JQOMkILGueiSVBOWTVd9ZP0HChZYxhhLxuyijKD1HueWzbNSHh+ZTOTFvIodQQMpVenVWJxYxqe4NzgYGBjGwwwm71uVF1Ve7ytPUrKO1FT+06I49QQBTTFEmDnsCiZ874v4Bbv9Y/nOuvWAECVfNSaXqDaD2allHmQ11aPfN1axlle2lRZzIxZzOGEjSN7BBHKeE7iDGyxA1wB4r/tClm5bU1mQhFUmcPQqocKbg5iG4VOa5a9yn
		TATvHEXy+RfAlmpZy0/Rt/iZBHT+0zQeIAWfLXzLojt22f51IjSQ+zadEQVMdjzR+AkByPI/P+sGmNZYwJYAj5CxW0ECJhe8TuVceCnhSEIuy2uEKnI1UVdPoZv/v3nKyuGWbqdoPfSeOIwOOJOOhqhja8BZF8ppmmHoSJOQnDH2hiN6FV9mf5oweVgIGdlKZfhAmDsOI7I7tX7C5m1ZWZ/GLAEpZKa9oaGhoi4WU1Ck1Qj761dOdHxVPNjux0R52sKCAi3DUp7MqREsvBhWtcL5fwfJqvnon/ycATA/2FArXdyjBcMv4Odm43h8vcE1R6aTpd9SnfGR07OfcL6CfHmxKMQCZoxUvfoqmbr6IJrl3qFIUks/OnOlJe0FH25SX+C8ikE4ZEg4fM/ts1zObAeRA/8KWK8s5SvfCgGfEwJDXOp8+CyeN9x/be3trHlxxrWTnZ3f6+5Sw7DRJuzkCjWqDc/nFhQqMooA3o5iOy/nemv8p1Mz9CIRY/WgnVPdk/5A60nynCx3jnLL7YQ5266LrZX7mZ90kqzvTjYhyBDhgV/ztyvFc8jhbZRTe2ObFykzI7mky/SbDDZWUnaiNZtHVdHR0WOaMZnn2LTgN+IV2j+rtbcnGYjLr/ukOWYC9pAGG1HDld3FD2Z5fKvEL9eHGvaeBk9CdmSz8PQJiT93BM5HDOIi64zdtqQd9OYX6z/hBxiU4irDMVmEvP2jdNos7wdTiZAl9m6Tm1RufttXWQW+axK4OI4Ljbv/uoej7fnjT02muV/0F6rMFlfl3f7bZ8tU0Uy0
		+ldorsSTtRPEFzcPRqL56C5TFSZS62a0AZa/Fzo00HKP5PDwE+MeG1TnUidiQzGDZkE4YX+Wo7p2fcRoSNKZtHBj09WPPhFbssvPXMZcr5KQHTsSfVBTNo5rpakrLo+S8BYiqrbWA3XXdzG4HVpcJUw/8viIjl/1xGa9luGJ2dm4qnj0LZ1/HVUVKIEj8q6zq8vvan9WuNjvsb4fCnCcQWkLGceN8ZhXTfu+MBEboXA+wY+Zw2QCgTHHlK2oQcmj84SuSlYmOvyfOLXttCpsNmysmqD1Tca0TSw30qoHXtkfXz6EM4g6zkai4smwa3gkp03EYlVerQNByq7Ohi/U6veJn0N3Ej5mxS7/gvVV//ulRT+VSObC/BUxz/OXk3QrOL29ysmRSGVIjrDTiSmBiGiSz/LJu1nGT4v+7Z0guYCP67U5bZMU8oRqWMx3CnQ1KedowxGppRVze5YGj1CuAwgqDObfXGC0VAq3MV0Ui1uY98HIzXoKmD6svLzxxDqgEuHCPrEkII62osCKztZnFQ8kbYOhy0zPIw/6ntS+RMjfTTSu20PXo/ZB7HaNW3TJyLa8yKiIhOIgGyBgKj90o7eoaolig2v2NVSH3IXcqAJOS15OHLiksPA8HKIE8fH4uts3rQV8bAERXFxlKT7ohBsxUH6e23UY/DjOEadSoaOlk/6fkLwD4cT6Gejr1963j5bderm7W8gOfETpgNnrlzMfzkCRP9PsMXA/xGi9qHHuXDMYInjurApsQ+0eCaMYFcF1z3ZMm/whFmzqXAOt9wqf+9KPWCfZ
		1MfUoQDRV9wdeo+DHHHGAU04cqt1NKQC17SeYIOgsfo62N3HT29lYwq87sKj+SO6Dcs1avk6qi9of3Qbg3R3+wHMCASWyQV9NKf+5Bx1LFITro9NMvoBAeTonpyQPvENKw5hoOkW4VaucXK09TbcNGU24DNjKeHN7M8Fkxd6LQSvMJ0myYQ6RU5ulOok6r8eiS5WIq04CUUSiCpaX9/K+B3knzpdjWl348sQL0LLB2zeff/F5Je7R7yA3uvMEOQa97C4uEgxeu2jRwTns5sTEZxd6FajBStVK7L6/gBU/uvrGJEtryxDGnGL6O7Xrkrfqw9gR8g2mUrWnxie8js87vRnxVj60r4fbHGhHvKRFxI7uNpRvEdmR67DDfvDCKjlL6itPEc6jyEk71abvQq0DZHzpgGzeWgylGcx1/UROX3uSdY0HjK+0F12UDAwyXwwPVR+evwavnr3bJgzVx4ycRzYZukRiEvcOmVQC3hkb1PJF+QJ5JFycquFh/nZlPh5V5GCEuXVVr+l8/MSYDs3/H3Tg0yrjrRtHzRa3Oks5tKej7yXO+qN6U+fWg1kBUXr1B8j3+u8NB96XKYlIqVJMigTI90q98gWqO6Ig/Tjih8eHk6yht2sNR/nq4zawreqSAp5Jh90h/enPSehz6EhNNiW0e7VYbJbRCN/c/+UX53aVAjp6LcQXGetYuxjAdMoZrS3apXr9j5lj7Z/faDvVyBu6jlkqgS99zulAM92l8+FFZR+MnOcK7Qm/X5ta6Yd9ZtupjIxv6/zJW7XBaRNXL4Y6v4ahiHk
		ZwX99o3Abub+NZoMP4BgUfabNl/uRezDYHEf2j6a9Mx9XdZLJFBcJSin4XlVMVt4E6Cunv0mEP3qmzf22EciL8IHPe8zV8o3NG4nc3ZQFB88RWVxfyH1xkjJuTspKUWOfpqIz311iCLeWeHGfIz0fRmI72fTW+Sg93EBEjiPH4sms13OTDp8r16B2qzvRabfpdivgU5he2Sh72MKKLFfeXEg5InNipGIpjVqlErLxtzVGJ4yfaLriY3P7UD5hk0WKOW6wDzNVEuALMEBYAFbSEiImyfg2b7oSeJ8bkFkkhbNWy6f1okrM/+bs7u9087PM3qQVlHdGCGS6Cblm3KQjWj5ZCcjTg9eVznDV87vDuVuJYbt2UnTAdFAtvBiLTdNJsqqxhtvB1321+6W4l6Kxl33vkP71yGeLLwaqCT98q17V6845BEHHuE+7DfCfipSB++m5TD6vx7HqeFG9EvnzvlyDPfT+rW2tlrN+kK1oT+vr6/RQCKC6btp9RD1rhPmmqXnHVnrX+FPT4MjyDacmZZVfW7g+ajuETFc/uc26FBjzoUFv9SicpAb7be2twJaHNyZNAYSzlZzMpBA7xWP+fF9wrmKyC7Yt63xOp8qYF6fElrfUUwLbnwh6WKpg6e8lIjfY22hGoZspbXpXnQTzLt/NhSYRi/ZBb0QzhdE4/dWaoMUrAJ5+YYpW4UAwk09Y4a/qMvaUJUPCOdaFoanbW0QxdWzwK1p/jNeuREjBqnnp6mc9ekyCovcdC9U4ozHtO9Vgn2lfs9eBB1Zctv5Ge+wtc+5w+xD
		TZuRrB2bKBxsbVOvaq7q2J8rKysfQMvCS7vpYDBp9snbBVE4D2S/5vK5ikZyIO/I8m2f2gMV885NYKUek9L7lvK1L1zoHDd+9ye8mTTR7O5ljmg1A4CrtpVSICqfOtjnuoDMFnbH22uybKc+OJNtV1z3ZpFbHyrfE9IKNniGKC06TsFRq0V0vViWab4StxDj4Gf1nym7H8+mwuWCSLQqnYI19v/qEixYcqWR3etW1uXG/Fx1EJi99dfQuBcZIcsvV3MxFKp3Lux3YkHvFrpH1iJ9NJPUlKJsSqIZJ/BBSFI5AnZMrquyJmYjJG/IK0gnJqtqZC4k0/iJ6jcTWC7upqGpadIWJFy80fVxtuw5lYKGmACaqL/0/kdWEt/X9b69Sl+bLf1pQdeJK4rPuwR9iyh2nsuLkZ6IoQ1aynKp0Pr5+RlPbTshi/vM4xFU3IjxSrFKj6vb5LW0A7txHxWa4ZOxKz5FRq3jUaIWOriVkEzC3tRYT87N5ftpwfMehwom2OzqHJnABLNWXPO4+xdD/Dwlr5s1JyGZmcSejgYJOmNgSaOsZ6yhkitrrKw/tKqaf3cDevl3ygQEMyqXw3V5Zm+pCuvL2WONhYyvn57lNl8dTIbRtrdllv0iztix2k6f1r2QBKHwK01MXRIA5W9wcXd3ItcAk/Vv9A8z9VaduK0mYNHOyDo4GL/DDgTgiuJ3fXjHD6LMAA7QhCr3FFgp798Rk3qTMoHH97yX6zDTPuMeLfL3OomvkoccbOKO414H9e6iuOK5DAjXz76xFmGsPrzAz9c4/o2L
		8UcWNJ/LzFGpQRcRvVz8Vgayvxy2L/OU1Vn4yZtsM40gmJTshBSwlKaMJwf0brcI5ifRacFaaW7MTzkBj6/6+d3O0lpa9+/oh7H79lZfgGCy+wp0BwrPH7a8kBBLeTMZ5L3zutbfP1IhecltqrlkfiK9QkOiEf5h3vH5FQeIthxV8Y+sFQutx4JmDDUIGfTr3Y8/XJ/lPQXGPa5GPF5adXxOKKzSkirs+vP3r0dR3dbrK1TRpEDDwriahYG3Ko9eDAaIoBfTErUEYX+kwLWpW7GNjY0k2ev8qRmXXI4ArcbsJm/xrrybYxzmn5MHM+ioh36yhaN7mDocIIGKq84di/O6ix746qHNDxPfy3clbToohtycXMdf9k7EB1G+nlEbUjbf5lOt7XWPNnzph+anZA1Lez3DpqC1Vw4orwhOzPhNk0AjiDu7MY815Wvw+bZhx5w/XuyWjjpRYnzGhWiCJO41tqitkNREIZ7BStHib/u9Ye3707NKX2/7TrjheKCOUxDVYeruzTgprpqxW68rohFwSLwAOPjjWCuuIsI5nHfhDUg29VUcW+UVbhw5yL/yqmtn38NN+7GttfU53YJVBglLef/rV2bc0TDpuxw0GXOXWq1GiKm1mc+0FVATbAIuvizvp3XSfbzYb2KyRBAqp61WxbANtfbYK5B6Pi3QM3xzteL2U9qFReKVwQ2L5J14M83pP1EJiAQqPKHZzVUIppXPjy+EP3rMGxHBhubdrnwvxh5ch8OYcYoV0SIQrR5Di3i2fpo6bW+ggJnf6twv5FBeInc8WRGt
		2Va9bFVx4kmjHtT8ZbA1o+OBy5oyxS0zgGEVZhX9eJNYzwIatqUkISepvBICUd0lGnY6K8t4Z+0GIMF299QbmO9aUZjv2KYFwVSgmjF3mGHOaUHTR4Q+NzMX/XlFi+jLQ8Ic33uZHaLBXzp7sZfKwGGHmTgctGYJ2gCiR0D+91PLt9QoDBdoM/rw74pTtCBOzKYoWb4gmaWlJesA2KSFq/6jToWuC1k3tttd2sXQw8e9AbovppOfDM3oD4Oprg2y0KO9FQjJdCIsejIXB+uhyOZ7Nva9r2Nzdt3tr+WtRyvZu1RH1LEBHv8SLwzFg9TpLTpmh9hUWuR0ZyAIIG4biGLF+YFUg/2UoPq5GsNbNNC2s7FHbtnYwqdIgbxXGH8Ci0/4+A9dR9RRGhgCPkEvt+JhP8NTvpVfOd/jAqcZdyhZ/VzQtOIe3QLGLWf7ffddPI6fX/4cmBhjEOKwhwHhe6zPpikXjvWCHM/lOtWrGFRJlMhgcLaCkTNBt4ySNZc0pH8v8HcLeuuV1lJGWS1bUf4WUgPFtPneUIPhXABSL5C5kKYcRxo85XYOkKZjY1g/QU8+pXx9U9SWD6l9NIqEMwYIsiUMoGDYh2Gx/dHy25ejv2ta+/s6zeNinJm9r+V8X4IG6ra5JIBSalKWukoEdoh6J3r6TXxEcdf7LflncpSWQkWQk+kKqjdXJ8iZPC36w6/3xTtJ6tsig+7RqVQ+GVv0cULonzh2NkXP1R/xI/rGYWcdF2JyDY+dOF28mb04OngRum+FXcpGT1zTP2I6BKRT9pT+kVX+
		g6Ea4W7VtEfmQy3fvtP6slST1Zo3M07z6x7mAI7wM2PLo0+R+VjCycODdB9urAHAEdOTed4AWwAp53p/rnDnfeTzK1Cj7Ond65+e2amnSW8b+49KNLSyWnsdqlia6d/tnoYMvbXblW11bkqIcMWPIl3sj9U9sscpzFItjPh0MJdamcyQdoIjXzFxTiUoew4GyG7X6PzD1hGFLDj2FgNnDf8ia/Nte2/IBVxxl1NCpKnHYMYZZPFBSOGtpu0+u5PcdAOQx5CgLbNp6gkZa+7YjMQhEjoma7VpZoHz73uMetSIxTVCkLEJw2GCwrML0uWi+ZQJLg1T4neIOZjdc8DFhL2aFtVOAD+jQYMLmlRnO4F/3X6txTLvX7yeL2Vd2ZrRWnUQGnQHdlN2su3VAnZDE93xipS1wKYxzaFpIqSeh+T2Gc38lqfDTp3gJtfS8owpwKt5c7XzDc5QWCmDwMpJbhHmv3azNNj1bP9ujbG6nFJ08sEvzvzOP8Zf/3Mcf1P5+W/j7rHEJU2/r8wKK7ZCg3clcVtGq7/CyqnLGN+/vXySXYs0xXl/nQRhj4jjdlKTioL4YInLbbwqbszLme9SLHxz7KWjcHcAtNJSKnQKVXk+0O+VxUVfg3drLNX/XXVvtf3bDg93d3SbtBrxTHhaT/EsideQrRSiLKyw/akAr+sqic9YizWUEkT8V9Zr8nXtnHvYHTi6zJmQjzU87i8foryvl99XvtCu520RdIrni619OpDItJ4VM2ZvRGrk5Pb+ZefF8EPnIBX6OxnuxgfF0OaNzGEtMRTc
		JbHeDFhcX2TRaKzzheeJbREQyYm+8yKWqNJTJFB99PUbTDpLFI+fk7x9scxOauYsiZETb8Un7yqXNL1sa1Z30YLsMu9PkplPfKcF/+12BNJeH1NuacdOuzB+HGxi6mvY5gCtQ31ewgUQPOr2yHYYBw0W2kmq/LrOaC1LhTssleZfG/1BC6L68ngcn2dAsylraSYn5feaECEyv9Enap8dnwB+vVy3LR54ttj36zfbORLQ4hQQgrZ2lxYXzwNxRTnIY2R3PP5IdkbITvOPvi2UIDzWLrJlxOVYqP2OhHriVhZZK9xeqCQtnBmhKtOlp1Bi3tZrPQcZWd4J02YMIQKNtKzpLTcjqMbaPoisoUe3i035gmBrPRadJ2K8qyM3fX///m2v4ElP3ujyvdp/kHv2f7fKYvKG7k6GSHB2DWgPjGp0xgoX8sypa/iT6EINiV4+UQfVmfM3X4nDvvifFUcPXv80xJdJbFF4s5iT4WNCSVN18b2p4BmMC/FkGPK38ZTvqvnB5Fe+R1aXe6UhbPnOa0qaaFyh/NDnwONQYEJm+C/UOzMGVjKZaHwrj3KXuMdKzzRYKtvAavxKZnxUmwHPdlY3wCnX63hU+RLqjyzd+hY1CMZ8lTRnFPa5zWN1ddqDwp1o1kuc1jNqyTWqzUm+3ijCm/186VUOVrfc2s2ug9cCUF1JSUlo0ltduwdP5xJBs3BV1z+vuDvHo1x/qFkOJ/UfnWoa6wjh/1VgtfX/UV7dKpJ9gk9qcTkv+P33ZLROVdP3YwwmuWfMO4pD7+NXXmpPA4yZpzaI
		LwLMzfaOKGboARjSoH/CWB87OouOjs69813zEd2WhTyLTLDAET5katxVEWrFJYcQmknL2Zpt573sc2va3iOPptVmP9QgoDu4uLyvyTfnPJ9vbVb5hgSCwZY0LyRLq9q/fjCOHkoquMmZN4SaclXvZ6tSHzdVqXtAbYQG/0lHqiDtDJIrqMe7NT/jqH9/bIgdtJY+eTMW0qczyi+mE9SmiMallCBPq0/omPQ5eVo5aKPMYbiRbps5VTd1dP5rm0CGDDNjd/yT1XAlk19E2/dAImmK0e0Dedv9QC/TFfrXAQtooONnzeHFQrC6o9CwYqwFDnLipsnkQQkl56nPhsAEA0Kfr9o3MPtd+kzrGuLQqFZAOyNDzceeQln6Hf/s+HWYgYGPTp7HMJ2z5lkWxPMdV8p1csrk4XaavK8BnsIbO7o/T9i7rRSfyDRmt5dWBvbZBCOJ7Gh/kHbQNdH/6XNUEQPZVDYh2dAt8AgJ3SfeBcJ9OP79SSI/BH+7zjX++beCfCcm7JZwCyEZXkaGlrw9DC01XzSBixbbuN4yXg/rPI+zHHOiayUJsNhJtWkUXDCB1Tn9wHj97ew7kaVMbuTWjJ1Fhsz9868t0UQ6fMxnX8tXwrzSJrhIafceAvkADV28axcKX/gyRisUfcEUV3OMTA+mM+FYcw4BxYo9WhnD8JxcehscNa46kIuewhXNXkf7dpdWtrNMdUL8RtOq1KqWeCmBfoJKA7WUed4tlMcjxVdInysNK0PrV8PmTKfplTPBW1XpKMSyZE41FMXmMg9er1Khn69AUTUV
		GgUS3KwE0UYQQJdCWyfRo2sFRFPvP8EgFOSV7g03VEvAMpGthBfffBH9RS2euCeitj6jZVQ1oiDMI6P8DlGsLg5CIM4GLs7RjJGnQ9XS0kvV0Gp9lfc2fYKUwaWkLC1NesmYXUFZb5g+ITFI4nd/8B8jX9rMAspG1WZxqlc9qjmt386vvRsIFGJPjS2E3Oo5vd3M7ibx81adhIZZvwJyFg8k+6zn59cWG/y9hg0cvekvhNnLT12k44g/15J4srwx89iPZLpWrGgdgSHnGxXP9jI74NifJIiO/lz3YqjqejKteQJcWmlYkCX0KuId0qsolsQgVpTvMx/ah8riZ+abStLE3maaA+LRG9SdSEtpb2f30FlKNkCIU63fUJa+tZbiCydzhdM3HCtllUD5yfuY7V10j1QinGg4LvrwdbR+sG+KcSA0BYi0+NbBElImuEn1D4Cpa8z7PJoOGavc5Lr3iZOlfUawPvbpS4NV3Bvv9dvi+Cla12Ck9GBH2r846nRjEZPNeFZ1vXqlMtNfVDemTRymAmJkuLu4vr5eUrLi+g/t5EJdl6Ln2ZJP9HYK9CrbtkLs3GPVNv3lUlJuFl6pHWh/9rGrVVHebKHtH3mUqZ8jip8Bn+NO+3yZpG1saHgK2sosctv6MbqMQqkfNJOsuPsdI/6Mco4VdiRgvS3xYqars9/gmh43ojemp8B/7QRhPXLIC5gKO9v2CaWQbY7zDgvCJWOwMoTZiX3NvwEx0EEoSivITE0nv4t8KjJTRixTvwmnW3JawooFs3cQZI/MSRyWe6YmhhO7
		sba6+vwd5j8NCCLVb0r8yY4LMudy03oViJsQeJaYbfFTpeHGaTatQWAW3k1oUfxY0pz+Q6eYy/J58XyFntuMTY5LLOMzaF1gIjuejDOThgiYF41Nhdr+oZAKUhK9uS+CI4RQFmt2bb41fZrtE75Mc/b6uZsI2ZfDHamKO5SKu6k4qf95DuCIe1e/R9ZCBT7X9zqT0RGwDP2eOBWJHtHT3kV8SG5GkMTc2tS5qneOGnEW269/0MmJyUEM337493DrPVImHXc/dFksbtlOCMIOk51NVphb+6v2PO5OWM6pKg2VNyIb5MnsiRRDeTzejLj2qDrQTpvgJpLAOexJfe/Z1NDUtGYlNLkA1noEYvqLFs6vR/xVMm6j4llir9ASuSl9wqzf5HLwCfQ6rohG12VwE5pkWJffp1SfpvzPiIjEOV6cbeHMg+KuT6MsARSk2+F7VS29JQxkVL50s3Ojbjh6LegvT2Z/pGDE85M7c03/Wpqo66H08acuI8bh38e7aKA4CeIwfLGXcM7ANIcCSNUtkjgOMiXVgrmQTJW9u93qQ9pMXBc9SeqDqDamoDIt1HiSXr5Q0fr7hl2Nxn0EUdtLMeKbQFxTYkek75+2qNduaFqS2OIo6e3mq45QTiUA7SENyWjyGxX7ta/9GAoA0z9iF+KnqaROVux5j6Y/1yKf03lm2nTlAD4/lOoxC7VQIQ4jHYDeTQBDjDo/eIImDtA8i4uLjqgf6m9comef3YbDxBTVOh2FYAQqGyXq0yRFkjnYQUan1uPEEWuBiwZ1cy4ZhNN6OyM3TwwI
		CYi3xn5+DypYg4LVQ4RQ3FzYI9ew2rSea8lRW2FyhcYnOBd5XyS1SmJ6NCcB7qydUAiBVN+zCt0cmUJLxL//f1vOiUlJ1YLSzTToAl7JpqoFnNE3MLhBuGUBTlY6clZ1G7hnySBxyA1EmGibfl8C4sXwRZK2mL8SncZ3Ndn+yacj3ffrHqOb9Hn9yYPCIPQuV6tc24MUi/erLBEUJOB7+dcaQcQMiDV60BsXE3jo+VVTbhAhn/6FuBwTQXR6tMu7jZaQIh7dMwmzy8LjTxz1QtsnvJl0RNypY+y4trQ+1nZ2dltLszKdtyZeKx4Iw14gdEXr4UKPktt14bjyZ4r6fDoWvzxN9yjor9XjplopcPtIOfzHy3aUWIEtq6pPVL9R1zHizKM325Vo73edIZ1A+oGAvY1DmWXWgcyUt++otFNNXSYj+0/7VHirvuBozT+wqB1xR2ahYE+ITDcpT1vjAMcaD8ZhxRV/otJFBIHPidSWp8VS//2OnpiM7PF1kpGx3X99FkBPN/McQnsVDDmQmS8viwn5WXShO8WQWBixR2kJ2hNmcgrdI9a+nO19mG/yGTXZFsBda00rVKS/gMF449urGxqu3IouLFje9kMvdsY7Ye3BWyl7rC20YC2oie8fP0KFkWvQ96Jt7cRGhC+roXk0beslujemTefVyBMxYjuVgdEHrTWUZ0jixGE3iM3RW7LEYVBGcO6e4kKk0hlaUGNj4yBkaxLQ+yGha6xLj2EYzSZvAXAIDFaGbh5ykm8uFPDOOgEAcUBsearGt0v2q2pbdk8y/Kmf
		fR4AzePoUQIgv2LO+xOzvwwIIsCExOLa/z3rwY9Nokww8i1Fu6sC4F8viMVnO00y8Z7qaEaz4m1mbyTn+fEk7ZwHA/nNpz1KMmygMxDFooK6HIFhE7cnwkPQtsEBBmQtfyzQ4+jmE4aKKJNNOseClz8KRREYOSrtWaGDeUZU5ZzSBZTj98i0Nc86JxOMvZ1aNjsm3OMMX3xaR4gzkH112wlPEqg4hjb+/tclmhxXqEHQj0Iy75pVdVa0A6VDX16ZA523RD26rSIC1s2Oi4hUlst8zaZX2e5zyqFh51QeZMBp3fDtELP3Ozkg5Ds2rxg9zfQeEXI6Op4MQBiunw8lsx7WLJN9Mc7xAUM2rvLqR8pad6JFbs18BMKJB8DMN5X+lQ9NNaxrMFbP5ianDX9UpJ9Gy/m0FQOUN3htbNffzOARgSpVsROlOx7oX1LqGUSPzYeubAUdoO/022/njfJH1L3SfKFacc1SWolGjvtPlX/Bd30MHXwxs+WaEuM/i6b3KkHsoJ/S55VFF2PSFVHwWsvRe9lOQvEB9yR/2UjfBQcCnXsza1DFxSmg+xy2EHNoXcKnNf2O2ruqCQKAwi+YO7Z316jmI6dLBkZFfHtYwZx+l8vV/iyDknValC5QsTZOTnDy4Zi0iViOFyVwD7v9uHpQFydQ/VRqG2wOre+1Ele4OB7gw4FaGi4x1i+7+FpEKTmMHoYQE30T96haChreJQ1bJEXA8GK7DP/1asAuCxc5FZHsyGqHHxR9naCobmuUsRfuc3fakYWabQckWenP6d+J9b/Dash/
		3ny4byz9Wnpe+XKUuTrjOjQiCENFXq9surKyXTXhf2LvL4DiCttwQfDgBAiuwRuCOwGCE2jcgrsFC05wd0IT3F0Cwd1dgjsBgru7u0/nn7l3t+rena2tnblTO3u/4tRB+nz2vPI8TZ/3FI9KG5ZkI1dexhU5e76jPpeBxrlQk2SFAnKsmAjgxNLGxlshPfU+XfET1DfnmhzNy3bdMUIHJvfJSRWp+J56Gb+fvqldE8+v0cTK/+nM5wjhIxEt9P76/Y/ArmFpfuxkXIS++zPvuIY9mIQAliAynm5cDyUPJQevJIEcVuBu9j1pf/FaWw/UJVAD1jSMCIUIOqVjCaAJzjVlLB4VQeUJxnA8UzAJthFV5DcZq0u68e3T+p9nT7Hf5KnQJKeTm7a0EE+X5bNlp6XyuafNN+6AsPTzyqW8+SBX2TUVNGFDYwuIFRrtGJOvNao6dn2hDlv/KIXfgxWzWyOinPSq2KtWorzxkrvPlGiKxyNpcrhKM0ODUnt2a8KRkgfKAbx+RqMIfzb8X9PJS+ZWFNTVaWHKn77t52nMdj1+GJhzTqxmYnzB3SrI+jabEN8yKA/Fwj9r0OQB/AuxUy8wMJCcm5RuFqX8LgxZpehvmlTfhtz2PHbM24Z4g4dHRrV9eWCsKctKKzGBVbrw9c4rJ7eq5xtq1RlVhgI0SNoAkR6ZtwujaTzEp/kpVggaT/6cj68wra2Yj6/Cw0MVCbYPnaa2yyGhXXwHc9WlX4tVVxqEDssW051efD1vSUk13Aswnu5X6Celqr81VFWZzqcqVQFw+Skb
		br5BQfA1QYbpmFKJqe9FhmiCquGRmYISo/90v9yYGGNLUVBTJwfF1xX1sX//w2RlttVI6UrMU9d06531LLapWemX9uE0/nSXZKzqpFFAUspjp+2WeZ0eJM5lgwasPb7UAPmwA5CBkdTU1LpIquuwHCZfoLCkRAcEMqC4PDu6FKIGUdky2LWuX53tEUtZu2ZI0qvVPr1Rvl/WAUXQSnStv5s1eghk3+EyHqmax+jAiurPsPu5bPCjHurrMVIjWDE5y0BhEkxS0uzK3Xb1+S1ANyBGE6/sHr7kIvr1jmuVQdGr+7L1TfnmFZLVMf8nzHCcGA6gBie057mc87ogh8UXgPRvNsR49ThHkkDGwkmcrhWHC57wf9U8ryQo9wb3FDsOFds9eF1lp8GgOWUUCEcvrT/68PsZASuFpaWtPc75L+pX26yg8N4vBLFe086JLzQgDhqSx4N0mP6yt2JkLv/Wc7bSXOrV9VZFTMwOEdOZNF84urb9lBXxs6QDdGFX7MZ9To1j06s/2qEmvtT4LQPkwDeYk9547rONPPogtv2tTkxswuoT7nU6Up6qMGVWe5P1ZG4ExxklrsX5P7LFGi2QasIzOP7hwwcm1wx6Apmc/2xN66b7irm0S8tYLCrI4YjVWNLAzdppzhQ8UeHxWeYaL1YNbdnXdZ4SCe0mpwEiNeD862Xj8cUggp029hdE97OBwWvsoVyTMsc2BjCfkkZQ48TdR+RrXPsyUyFuWZGrAK8qc4zoTxqy6ffa+H7hI+NW8A+PQ3PjEWyrY6PJGv3zfDDo3HE2xaHo
		Dt/ixN+Ewz0CsnQEpSnRW/x7TxPuxxVkKIbNhwIMwnsrL8U8AfthIBwyXgGBPUvccxsfgKKpuqXFMxqCBn8W5ibgUw+JH8rGFAmNeHItLilpQegULHfc+gEZ0Cy6eyBniIzzR1stugTildvenI+UbctfYmBgNJOJ6z/NLDjr6en9tD5nLYZilf33BzndxAWSn5vAy1ugwyWDKgmUeVtFWxyZcn3+BzIsVeoIBWtb8+b+xTsh5C2fSI64rzLd4HH7aceh+wphLKPozz9FeWw1r4Hx1vdhkKLSUoGkreHymq1YSPizC9O33Ywq6YYYupRBZpmiW1DlvpTdn45V/W8D5p9INvkU0Z1MOVLwgWvg39PlN3pC3/MjMwyav7Rx8fBgvA3pZoUpdISmZ44Pwo9yjwFvlz8YSLLbTpYJxQpdsurBZ7YVt/ro1/WUI2B+yyjoiKlNkTOD8Sui5pf2aY03u/GNjiW9P/07N9c4qO0pU3QE80dHVXRXQM95qSASHeMeEeKqt6skc82DmIC8/E3x/ufyNPYji0z2HUzn7TPBH5Wn71vzefpPfpFPrz+hJAnZ6rgGKNaFBs5YPbu5MlevksvRfb89qUrw3kBHbbSms/I8hH/sTMLgPShXb3cwgQJZ/0MfSYcjsy8o5i70UO4+e0vyhX96ZqYdZS1ceR6+kAeLPovk3VWGsFpmpQuF6Gw0XdO4v7J4hNtF38V3yfEziVW1L70dnYSOAgBkQE37qeXr/e0/YcsE4oS5K69pXAtNvz8sLkrSJ0uz5/09qwtdyzF5ACmSzBH/
		rQYJt2Wjxsvxl5Wy0+dwdtRAio/vAKmVBClqW6gvZO3ZvGJEKxSYa1uRM+fZxa9ITbq5ndXaXK6OQpqw6UbHxaqmFl/E7V7u1w9WSbHIvMog8X835ayOu+RoOMXBArEYtNihvlhYy6u/CEjvff9ZTuOu+24M0yArPlYM23bsKsbHE0fz4H5dFNA2X5yy5Xj0HgnFetoJi7BTd/xAtI5s2V0EO6rXqrCAzpNiqX7bgxfzy6us5As5ZYqcPtraJ/pjU/vfZi6+r5fHFWjctQT7sZ0bP6lecz68pv+ZkyyQCHnm91Mq795KZd/ZpkDOzzbH645brLfhtxqKp39/T+jqeoV0b0sdNzgsvmU7y6tLlfLy7bba02e7wZsoQLr8svC5YNtAQMpJ3ePnoh2r3bvj3y0DzmQE4eys9+3C4uAhqRcl8AtvjNTe1jbGz+0OJOWiv2pA+y5fiBW1DUXr68hNkkadjiMpmEHPXPlRYbhDKpo1w0D9cg5rJdtK3KTx8CMLoTH+fbuvff3dK0mEhGJJUdG+QwZjlsX96U+oz+dCvPqdI71EHHoFfDdd7QaZUhAGaKHwPUoMd1TGLH38G7bioeI+pQozZp/Rn3BU+jII5FBnlRUXPzgVncx28NQ+3YoyJDSTdb6F+jtqbJTun6q9Jrz6QwmscKcMyWNS5tcucJdHJ5VGHzZqX85GC4jjrzONRgCF2zLhFDwF2lqvHI2jjIrKFPpsE4p/4qu+DE2cBgRSTrCc552x33y7FBmshu/wBqwRjYsC7UrsrA6nDevWp/0oWxaGZJ0v
		SvYTZqtZOC+8SPKW48wC0du3bxf1dhlwtV8eKRJknhkHH8HgMNukrXFOxtNnabNeOYC2GT3XRXG4I/psGQVs28LFbSEHuUhQXg40KaBAxof/ZK/qwrvKWaV5FP5ts8+5eUxNCrpCJVnZ4WDQhbE33Jk+9a7uyv2DnfbRjRWQsscX9WCv/YLg90vEx8dUy2ui8fP0tJ+QPmqAoT4m/FR1rzDtu4ixv4PenorDvsJQIxgPHejec1/55WIx3rkiXPO8HcFf2qQNRmxC//XCyvwqIPmyHT+XPM9psqUBQENSpBX1/uPLJXWBKeuzA9Sodg/4XrxztzuyJvevLGYW+sG/RpwTBWo9gm06LrsiOyKqaw0IYgoPRSwJmF+fwPbf5BsPIu0ksV+jtnjftw8SAn6/zr19hQZxqslfvaCU95XD++Gq07leVO3CQNWbMkFmlOK+sR3m7rPd2L6+4zjG88wUMGJPKnH952KclVr9rcje42qJgNsv83NnrNCmsXjaZq9V32VtTzQgulU4RkqXBuREWhptcX8bA7WsWMjTu05gVusCb1B4eTnmqfe08QXNP/2AT7Fo6mKcOK0btNrRVGpxCLwxQDIMOhS579JePHn0YfQTk1YGlytSY/M0jamh1T49/ol9L4uOHizqC7D1QVd7m+TJWSb8KG92nfJA00nK7NuAbEvw23s2gac+XPT+GrDUNR+ipeaBUsJR4EDqHWBQVFLiOeBc/uXn9mp/IpMWhxAuiiBc9phzopdELJDZzhjnc2The6z1QENxW/u0TNG4nCtg7+yud0FR
		sYECXJdzbhNbHTOs3nYD6NTzlKAa7NAektmmH6GJvsJfLSyIdtxXSABJaAo/rT7dI29rKtm+vRz5XnMtL3Ly9X4X31+e8qKdEeTMPB0zxAiQ7PCpCFXPsNx4d7wTwfOLAMyosUMRIo3xoH7iMzkzo15l3B9p8ONryvGbWPzOU9+55YerdMPRguAL+mXmSl+L+13kqt9w5I31OeenuZ998Jx+vf6ERgqo2aJ5RG7p2Ybfm4iJiU1CF/trezVqZzSNgEzQ4yoQ5OB/yISw45u5r8/zGCl3gYzVhCkSfCjSKzXc4RujiUfj4+ZYWuXoB36VB1vqmQ9pUMtjwo/rWBWYC/tME3LmVlV9izi07pUZ7siKiVdlcA6E6O7yycJoX6Hzn7ZlG09gGt/LQ/bAQ0LQUe30SenWX1uFFj5rsfz0xXlufpaaJ3qWBeRggNiOYmjciM0cme2ofXKkTpDJwFiDAZonRvVBTQyb679ZbQwaTamaX/GiA/XMGRC1X7yHkO62tv5E07JERgpnbrmDlPf5VNupmopbWlp0wJY1sve2kf2bs/vvXl4KtrPE9p08iutu3mARbfPJUoLmbfz7bY9sffZ7DS8HATOp8ZpPdRhQZyYPZc5cWw8bstTPPHr7gDbIKfP8J0PQtMx78fZZCfgec4Ro/01Pb9l6tkkmONE3klmv2SmdfacBoGkZU17bYZF8HGdZPDcrDfv9HvNDE7rqV2iXpL9n0Q3dblwZUr8knLHAsv12zheFMjVYq2MsAEQ9Gzqwz5cr3FD7RKpZb63lThN3/wq6QJjV
		QiEdZAZdzEXxxV5mVh/mwzmgOwWskU1crOp4zeKchnKKGuO/qpjcvQEUgoX6FnXaTx8rTpaKCTp1+pKn3r17l9iCpvYD2ikl/b7TA1/s7OFvUu+dvIT65wlZ/hWIM+guZ+zt3VftlxbJLuSPrGTv7h5lh2lICINvxfeqmh97CGu4kQNsAOx52Y4BEw4CLi6uY/uUElWL/Y+JMnlj8GergJPDZ3LK+TeGY1Nmx463TiykFp1a0b5PnUpa2i/k/tblZ11RvlzKLca6hRtOQH9TpOoANK5TIQccHJ2vwPhZQQm8TbljAgc0rEXL0dCGDdgB4a4ZeXMmWbQvDi631Um+qe4F+vAGQPZh2c/tVx/qlX+FfRgFXLr/nkXvgy7o92yen0UnoY68K62Ag4XR+c7qWOv6+pq1eUz9oPbpsucHHiOiq7PzcwMkfYdPtgqUgh/Tb/44vJq83HZgD+zCEh7zJTFqvwADO4Siihl4RC03ewPR3TDp6IIpNYqaVjwInyp/bI0Njo5LgmK0oOu3ykBUAaAdy7iQdWrALKGTfrtijC0pPUuRfK6/Gm9WRzs3Eqbv/En3854gT/OFutSPFeMM5DhOX7LiUomWjrhmsnerk8XR17r9+CKFNe8ucC4GDdkt1lAe0D5leEAus4OkRzl4gnSGikV0yCcbOid14cpsneUrpuFoErf/QouigL8GzP5+UCmKF/49DXs/RUjve9z69bpzQr+3X8pHDtxVXoNHbMUcwR4Wzi4JgUg6lOy6E/Runvfrmauc5m1nFaSmpYV8716fB4SgHhD6
		BmDaC3i+1CMdfHt5lN8II0wvEnho6F32dTjrCPbsS0qQ/sde4qrnX9Vw/Z6d0sA7PUlGB2LOlBGP2AhA5MLU6ni+OZxVGBpzqo6M/RhhluBFJOnRo3Ux1sZl588Pno+LxnhM+92w+8XsVX+esmgyba/WkGDYwaS7mrgNTKbEsAeWUHO87Qz9s3jPaxTuLhg3KHcmYEchzQhqqK+r0xP+T+rhvv5d+4QqwpEiANNJBXKIPmRCsQIEGrCWfZ+VJA9v7s0uNWGictfc/ONb0Bt4UBqe5tE3nEX0rdHe6vIyOvzpXNef/wbkf6I93F64kaOZkrvYO+ovKavbnZmdHXdOlTlOTPT116z60rt2cnLyCHitOONfk6UBTEu2gR2C6w027n0GOCtAB/6aCaY8KLaBaryL3rccwUSJqFUjMgxt2U3b7SqbrtVYmowK1K1bwKg2s9DbfooBY08BRHv92LqHGiMxqaSKp8hwR+evqf0aqRUMw8JDpgMxZtqmyrQdO98Ph/VPLJoa7V21UaCP0n7GMINhr67u2i9Woj3E14WiYl8BSUkG/BlPOFrgY4BJ4Mn3FAJoSjX4Gs4rxF9UgdOZEAre0BeMqLDf41GGsbS1FWIjQX8l8FPRNVfypPFE/K2TqLsUfsyYNVx6qvu1/vuidT8bbB0FLcov/IBiXVMHrRfqeuTkoAFiqjzraSghjNxso6z6tH7xhhoD0Z7Or9DF26dqhsZ7NYrCMxpr8L4v+fIdMbFKZG5R269VLYQfv34pF4WJbylQuAb/fMAfVMCyQPiDks1l6lKa
		lTRvuJJYtj0sL+ke8hbRdFYmiuYjbE/hEX7RY1nHcFYPPtaTN24OYWS13HvRYaSgXGb5n/5q3+w66YC31IfXS49PkhzIAWt4xiNKIOwv4z9+HEKzKga4p3Gs4CYTCplsnjKO9Bh+TFF5TaFPFVwnA2AlVQ+jOYVeY1q0vM6DtNhqeoRWZlrQsHKKYoclfICKCJCgDRn6BVJyEPZg+gWuCr8aZg1nLeFj2V0CQezA+gnHwI5Cpalf0EzE1ZBpusa6/BVDbnfrxTpQLB1Jyzt0KSC42w5oWU3NT7zcHeUFA2Oy1NijJ8pFz3nbBvBS36F8i0d6hQLEPuser0IELMJYv29SA9fn7r7tubFBW5itYaxZcUq73jMTr/X6nECQOfeIkRRq3oWrg84KgZgbIyNgjcfJBA0LwsKJGmHgI0EGRLB4O7X5pbK6CWhjjz9hMg0JLWL8Sz2bB9MldrPvvYIVOyzCpDhS0oE1GCzeeWf8hFeotr1ct78Dz/KqvrD3tcYOmkh4ZvLQeFr8ZN/p+v79e0M6ooo3lLYj5ykXEQFkAJuZa4dGAguz77UP9SxU2aof8XU1knbKn7s9KXjXG+gKzMKorkKXqSgOiqEBXONqyy/p8i6IpQ8fX1BT5PJh5zdoeSXB76DI2Gg/9UpKvoiztPCvBYJyHlNLbv/EdMACVjYlp4+IIqRAtC49KOk9dmgBiaTKsxT0leXl5ScIq7cYcPZ6LpzoefEBdS46rq63OVDNhiXYSw7c+Z8+xtXehWVFPskObPSGlVDFDNhQj08SLchIvuSFmkQL
		urhiV5tTRnuhd84eHBys2KcpbP/AF3ljaWHBu3LZ2gLIfcsQb8rdNvAIZ/eF0m1Mv9SjvG3QxfE//TesywClcrK40hY2NoJT2p4hENWWsVwHKO130rRKemjvIOqMAUSq4TpJoUS/Hkr09zc7sX9tG2wsLCwwLCwusiLZMzulrcXmbBs8SZVfegublmWkLheGAD548L/x4mjktdf5shwkhw1ggEQWPb4xQkfiQS0+8uwPX+8JWK1sCth3rimQaTwzCeCAWFSB8UczAbKsU+gVir4DJbea1SaDvzN3vSXBZs1jOQ9Jib5KQ3ftrxrGcm0QtHF9K6yYQ0srK988yZPiDKeiLI+of9BCt2BsiAz3w6wzWd5fsvNACs0/09PX5XU38FhECheksQa2Vlb8H8mihMt7KzymYjoepKCcAIf6Fa6ZI3tvb6CD7g5qY2gB2dpg9CH9RbkLz4mvVyupqaksBfuqK5MXGi3iylBhuQ/YYsf806TtP7cNGqW0rY5LPmGi9ZfnurgCjfzYoUtKKio1vXp8asi1T9NkVPt50Jgnrc8KqvsnY6FYuEktHGk/x/BLPlA3hA60zSy0HBwe8jSPFaIEJnYsWFFDGdqDI3XFDD9MsOxwR7bJf9QDPzo0KlDcs/i1DA8P+6rq6T2XL7oV//l6X+ItoQz1u6K9eao1uln3vysTF+O+1A3Exisf+v7CEqa0tYZutUHXEeLhaXDMyOw7Tautra1wLnD6DuhvGcu5CU/0fameKUcLMMyru7HHKhrQ1xe7YFm9Jf9qabmw/iGbwU37pVgR
		ugZjaZ+wrX1Qjqz0ZTL0mqqZdiL4TyF1N4X6q8J2ZrKvMfn5+eFTfsVfoXPyiYFSGcjArJT+nNVWzgUk0XflrKwO1WuVHHntj/6sAay9DhTsXKsrNYOpC43n4rw80+RddwNK91BIuANUEOdsn+IPvv2EWatthQN8N6twhnOjxkV5zq6vv7FpeKPGDr2I9/xm0U4yd2IvhZqVIMZY998TZFlMZnc7jMLPy+okIVJ0j8rEfq/hYJBweVGR1iFHLsNb7ReGXeherVN3yF3o/tNmKsVQit2v3dJHGMfRJ4cZUyUyTgyDlcIIwrBZbr4epFfJvyt3LJ78uV2RDnUSUqPw+1iILjLFOlSdTVycui73JWsEUtBRuc+NvfGi5gHuQiEC8VLUiXxjhTLxiR0Okb9q6+sVamb04ddqQMpQVUOPHCw6Hty9blHuiAvVS5MUyDPR1p3l5vfwZwJ+5GEDFTih4Iap6OIti/uS1smlJYEPJOhZqGsCQEjjmMqI09aqa2ndKfynytQtQsDYRZ92ngGEoWNFXl5RYbDDlqN8Cp3ohTpUhlNCPQercx5Ad8oomPt6f0oeWxLOzlhaJ1aT+5Qx2wAZ2JxZyJqZnh6dNfVgIP83mCTH34UFj9i6G12se3NArZwTD67tuONWqn2q5OzQsw0XuIurc3HR0pq3u6bTSzitfVL7pNXkYFpaUnI4RW0O+1GNB3PBVfvFs0+75S/hlFkZKXr2z1lZocEm0IUbJrwiNze3rUOCUlFb3nYFirqOjo64pGR/0cxCDZCeYwd/E5n4ikQ1bxsu
		HXdUOTOTPUtFG5sB4iDoxEmR22mQl5dPW36vZrkKnWdOdBuVPbYfEbX5nm1AS8F2R1idSwL7zin1cGldSOtpxNY7QDFsQAUPD8+XiNNMLqQkXeYaj9lXzUnKo0jVUsbFp7NAmgwEeqh7EcrcFSQIBcvUPTXAf4r+0HcH0ACEbZcIsXqAPiJb0hb54cEB/v4vQTXrK6QcBo/hRGbihEETBcSzNwA5Qcw6VPAGKr+7j1syDNcSr17U5o/dutMv2EGgJggd0LU6Xvrx48f9Zl/EodM7zSKf/O0KGRRpu/3JvBAtK2EFh1QICZKh36EuC+75wCrtvGW4lnlZRDQJquHSGAFU1q+MKMykWYW7l//8adTS3SqznZ7YwWBxuTOKGkUm+GAP0MImI67BQ1Pjt9J0uu8XtBYAU81MOVefCYBGQyRZsZ1NzQ/e4oqtgAx4WR3X/KNfGcHqDBhf7xmnZW/GRHLrbr7G9sN+fCdiXKHTI54LDPuWsJsR+cnX91MAXMD346e31BEQJpp7FL8OWM1Gj+uD3qkCRQwSU3UGVot7xjpi6E5m191IjV9GUrsT+nUDckxXPPDuui/8WeN2VTOI1MMw4fBsWCJ33h2uvIPBAD6s5tz8/P3C1mDcoiOpZpFo7nbFX6F/AR7A4gWD0eHYtMCpUtzQbD87f6NKh+vBTYLuyzT7anuj/oxodYwILEqZhbNTYhEZlpFSgaiE1sZL8WJ6Afw4XblqXvwwZmgW9eGZvU/4p4Vlrn868Qlyt4w/Ul8dIWoocmRGPaJfOd/fkugiZW2ZWR3j
		AxnUnNQIIvFbIrFU4F8XVC+R16ALbj+zWDu4rzfevlW2+bmqq9BYz4Ck7/t8PaTJpB6W2Y9QB1jWDI/2xZbix2iWcx7nP7WU1fH/UVnjB1Mbl11LI+6lsJHDYiJ8lqiG7RQBAm/Wsmxom0g6ObC0Pjk07bozhrMPl9X5zjI7JAy9ZfbNUyoloQIAKKsCf1K9EGFIeMcCMoYJr5tRDxugi6WCQZMcD6rHAnFge7sVxkA+xI0AdGKKof2A6kl/bljE6eMpaeywuEkTu1kwhGlW60ZmGwnaJ8pAtenwUCAFIQuIKoCCkBLULY2OExMD4gA9HjrEBsLEh0kxPVoBfpCg8xXvt16x/B5tK2+yUQXHN1rAJkh+x/OCx54Ejx4AsbhJ7q47Ma1ccqUSWI5FCEmm6Pm2IzjvCsafvgQHOmtAWlwBXC5qGAD836h9tWA2trO2c2Dl4OJ2gx6s/yeMwQZtPDxc/87sPFxs/8/n/9IA9g8feD58+MDJxsYNsLFzcHFwAhRc/yfM5b9pzo5ORg4UFIClkY2p4//O6/7f/f3/R9t/g7+Rvb3j/8FG8P85/pwfuLn/J/7/I9p/H38rVwdnWycLG1PoTyz2tub/343xD2DuDx/+X+APRZ3rw/+GPycPD/c//Ll5uKD+z/Z/zBL/99v/n+Mf+llB8i3KOxTot2+lpcDK0PMrAMAAyIjQ77xasquhpzf2UlrQpSN9+XfAfPRIWfwvn+dzSz/KcDUk6Xd+7bBzuX3nQfkJFl46uhOGmjI0XuqH5S/rYbVYU36HOOb+RNmlzcb3
		LN+kj6htQ0n7l4X75RPTlkCLsWHUP4pxxZVwpQAkP1ImYMKfsYX/0scXM5ruB4DeeXRMap/lSw3reSq4tOxq7mK24hkkwIvBGVZfX/8eYAjCNB3RFXoxCIOgAPB9FYwIImATgE6of4SNc/j8lZwS5LrxCkMdrwwnCvE/f82ESOS2pdwtXrgh3ZOKZF7Nd/i+Kk99SIP5wOnIicXFcekA0kbpTC8SpOxx6WZLhQnHmkhWZhgc4YZObXjkswwRGNdwhw0Ljy4vEVspKAUH7AQvQuDnPdJqQD8dK5OnPVthIJx/jTG++cb93JxSMpLkTf/meVgwJgHbJQIwg6XE6YeS4YPWPWebulOf0h6Z4pmgLAh8j1fm5oxTLo6GWCY3oXTCgBZ6R1qCMFuS3V0/vCOdIfLMbIoj8MWHCnq1jeaTBKCcOqcEsO66U12WNWN8KTLcEcr7i5X3lw1QlkngvGQA8aEZQjcSXNv28+d6oUKHu5mC/pPQn/n5puSUCrMdRhhr0x1UiJQJHzprj69Q8rzpDsussycMfEoTVGj7PQJLCGvj91xBI9Axv3+1sbH5gLaJaNYO04kv3OPDkoL9ev9ZhlRVhtRoJ1vZktSP26xdBfm8/+HhASo877FmRUGsPlGGZhPT03WfZNwF/Q4he9gdxnwEwr2+3Jucgd7lhzccjm85NWAb4yA+7AICXrt9EcSkHcbpUVu9FSmRkZHDKfd2Kfd54NqeU7d8kE6PL8vI0nHzCXSBIMB05IkY9KAkJtbtDe7x6ecxGAgzgAvBIGeRpYmroM5xhWn8
		c+o2+V4HOpZMEXRVUeyOzJxIwBJD3tPKQp2VsU9/4uFWr7Bs8vze3p4bu58OoIvUecH7iygOdUOYmH47TnnoU97f9+Crj352wJ3ph3fy96Q6LLEEr2hQDVzGjbapB6wgZy/s2u+Ay0Nfmb7rzXpPOi8zAO+B9v6RVUtLS749V8MmsP6TBUe79usns/YUSIBPf24gCf6rCl3eTXM5f9dIGrAEs4Y68fXKqGNzCOFiI+u7JlO9f8orTKf8pvnG7tvLT084dHmRTeWefimsMJUhkHZlA4NXRlDsVLubP3Qq7oZmB0dHXj+VD8hD9yw7Ns9/3FO/vIlXfpYpalMeQk2+h8fyLoYir3GvF2AeR/DKW9vQYAC35gh2qlqtchv1wn3VCm8qb5lyXkaFFKZBhLSgvbc8ya9ZXGyQF9TU1GjRX7sDrDf8iXLs470YwGeZCPo8F2l6VpMduJGn9fz8/JbnSEZizbMNcsW45w+cqxyrmfsFxpQQX1izE1cS8wZlS04/qFmT69eYybesfrsfDMD795whFFDMABKMF7KI/+r53W9R7Fd4maLN8kMXhjyW9zmnc/XPgzs7Oz4dmxdwq3GyTxT4Ycu4oWA+wAsFVfUOFY8S7EyBOWepNfMJtPBFS13H0/OROMX999sg1AOMk4MDbZa8J0S/pDtSWe5KTMmXGiMzdRkb6GTwsEhBOa7QxHN0yV8uV0Uh4WOGf3x8fJqoXE/B+iSwiYlF9P2bMx0uAwikQV/HiR/mnZ+X13spyjDf2Up+v7i4OIs54QrorrsypQSkqAAeoXvw
		nFnv/NOOTBdPYujZ/XCjKtEiq3E+MDNicYSLA4a/7cUwXTSTXd6kmBF+x/E3UqU0SSCc+WKmD2vIjjXaqG5Ynh2/cPhxLIjmhftdhNCJlQgZp11vh9UsS0lj411W8r3x5fbHE/iRUsjeZ5nBegWyw2XWkL6FLchBrLG//tx76UIZWHz/poA3ePAoGeMKKVgr7UyEKT4L44Sw9tH+YsEmN+pKbPqKWMZlSrqadvgz1VvO341MnB8u0KR4Ix2T4h2I/VijwsO9XNpncJKTNk6PjqyjlV+cMkn+fiN0+9LxzqJjVojrrpGEI5KyakDJ8i3k3Vf0+SCLMF8ZN7TwxGijuoo80ToF3E3R3Foh2G/sWOI7ZovC8cpRTeVWDHm63Wz6OgYGq+uucs0prht2dna+zFjeqCIxq1UjiGaR/ZTkKyeZJ42ymTK1C93DeOdqFNq/FpPIzrOQzGhyxjhQavVNEsP16RkYE3/8MQNMF7zdkTmj+CIdK5QPUCh7VqHc4GngNNmJw67Hd2sgxp4j5QnFr+GBdFjOaOe5zMGkv+EYbsyHq1qdw0AanMnK507zculYGABrkwbmNTBV446PUcui7HCUkLmP3vwoC3NkT7KbMTo6muvT/yvQnfLl5uaGC/AR0l8UOjQy28YUPqvZmrgxaOkf/r6m+2nAa7ACLeyVPvknU86zlfhEVVLqtNq0hJtYvnEyQoH1YiT7JSjv73BaaurCE/rX8q3WO6jtrIqADeA+77kyTf2E3K4mCNwP3C51fxGZZz3/wiCM84T92kQYHmmWe3d2rT56
		YIlVfMmfOWhoRp/3VBPvwOnXIJ47sfgcacGyVXqno60Nm2jqHQixPedPtNhbPER/PnEsIsxSHbQK/bztKoJjEnY3TgOWWFST6A09LM1L0sTcvcEZQdGdbRt3XvYAPehDIyatY92Im8KPjpKSErCMO7/f7j3psMmv+NZTnZPf/aeVirrZyVlwOaWeFTVKT+bsjdq4R+2DxWVaDF0RPkiOLMpDgeWHfSn3fpsfebY3+ERmvCkLctva2r5DToDKlVPNsUDHVBXfO82cbZOC8A6mNIn7y5jtDSR7M+9swp1y4oDpMXwln6KBHDGJEZIGG08CP2VQM8usdvR2/B0/Hx+L2Q4/wHTNn1hjtLPuwutwKBn3+BdzaXYqJSdWS5EF8mqN9vko2Gx6nUBHtpyDhrcx3iI5RW+2TVEGmi+vIyIiFO9IVZq3wv9te8X7nCxQGP5NsvvXqHet17nnz2GkyqzdTAsmj9Llob6wgRPnolaDPwnSZMs/QLp8+uEA5aEWvVk9RTAP14cPS9uuAvvROBtRvV94YO5gqiV1c23GBlyFv54yy1Z7kFbTlhPFlGxkibA16xuqOetaMbfxEZvBbu7CzLBdLkLx99lxFZiKud4gF666FTPx70zWylAeNGjnrCpwRR5Lo+XnzGLcar6jZRMhrahKdNa1VW0dOEUsVB56Lj+EbkIUlPv6DI9r5lOV9JKH9doa7ZzePfvDdtK1uLZRVT3+eZPiJQjZEYeJvge9vPkRVLfZNlMsEgHRPTAnGfEaqD/G5Hx1NTbe7HgkGlY1KfuPESKuEWtR
		PAUaSLssPfDfbo3Cl57x4peN8JzDAclxzjlrka5IB6zoqMYJBkbQrPNLmR5O9MlO5cPDuE8vO54W/QsTVvtUzne7R8MvdnXDXhFR39z6WnFfVc7OD0dTHw2s1ZaBzqR4WzOhTJk8ar/Fd8TErxNRhPmgwx7o/FfGRgxoyTF6w6XMdxexW25vO32WdZXNajLumV84wZpL9+PrzsHvTfT3Q15rbAFhC2vrJ1rhL8loHQV/x//dVGDjg5KVsvm6m353MIyDkXTb5bPphf8iSqlwIE4uLUD07H4wp5HSxDr1ElrIh4kcFLq3o8l0Myj3mPWjlOgealb6RfHNoxUL92/eu67ELrUVaNCswg6Vp+VoMAXFvFoHYLp6MdSW/43SAjizqm2IZYrGebi4ns3zn7OiSu9iG+rqBBXpr6mEg8ZHvCo8HwhYST0rSzXer9Z/DurAlP6kdxuzFVfyCvJsR+8c+2UHKq5mGsYX9WLCDzMV50g9pfKF5igz0AOj18em3Wq+65OezOMMh6O+YLqHYO4LYQRO1vw/GMJE+jXBIkTy72KVXfgia5A706Ab6Jshvbq7cUjQnptrTIr1jCWE3KGR56JL7ltYphLRZkmJ4vtJDCwo9Xzsia1I8u7zTRTn/gJbuMdwNTpwt1pfz23AKPN4k2dnZVVivCMMQzf+y8BsR5hfsKGNu92xrttyPcLDPVPU3+BuYqvdhn9r/1UEkRwOSkkNU82SMDd4qjStnfOfMsOgu9odgpGUp1wUAgPmPPI42hx87vCYO/Zkrl5rrFxlmrN4bWIrSA3P
		qWin/fxKAyoeiNfp/wZN5z+Yhptby8tt2VR8aAfuBsZHJKCRmp6DyYvA68n5XPL1rnLRlfOia9yRG/ybm+vht+Kvm9X3WmRD8TrD1dw4E9E2i8Itu5meHC8ZI413xlVzBJA9hJQrXsTbQWIJcmv+vFges0m7zKWcqOM0oWTr+STVkxe5ezR42CRkykQ1DQ3f9ypCtAOF/65Mg+yRc+xffqQ99Zkf6GZAuF6SexiNS/uVXf4cvczBTafCTORgoZVYB0kxIIIaazplFsBB9/K/UlDilAskoMzh7taOcH5+oIfA9N+YEhx2D26WvmtBxL5MOC+Qr0oUmHumO6/hvV+IGI0zsc77v1SZyhQtcs5znr7hvaq5pc6cAz5xpVykmL9kI0/4fltIrG/p7hgMEu5mm0nNbyLvZMUgF0qPGZPIDMtKeQs0YJuW0/eiF9wikUsJfHvrdyB3P8L5SvH5WuOofHhx+4yVY338wygz+G+SHI3vwEjmaY87ywvU4o0AnbYbzt9ZRyrCL6rVx3giO/XWFyPGyGEdsQcLMywhvilvXPMtuHGUHJnwH7Nn2wXwfM3Nd6Es14LVO31UrPo0JEu2zkAyPk2e79KE3twW0OHfHiBvc3kfhKyTuA171zg7/popz9zc0kJlbGwcBfP1Yqh/XmDjZvWhqqc9yc+hBKd0t/JLg/mZEC+bMqoE85iMSjmyRD0rI5Og40AI7yAsnCihpLgFZWjOAE2H6NgXDyHcrx8/m+Pani/EHDbfStEnBYn+lE1kNcg86woxp3qFcnOCGMr1U2ck38cq
		8DDqRZcvd1G3IL/J6wA3m7pR8QM8mPKL9pCyTaJ3d1q6yvOtGdPAktE5wVGkmuTxRJs+PwfapqWZAg12KKvHdjfOP1gOgdZl1MVdB9X3J+6+T6HyPjxtIxLpm96LMVKjtm3vjQzKvveTzZBMehme75qYS3fI9LY6iYJx0RCtYJb+zszcfGH1+krwb9e+mL34phT2cXaNGduReZaiiG5pXI/7q4yx837gKGCor/b9FZkw1ETmpJ/bySiUYkkqXXXlhCgCTkg07YXs6VRpynlOKR9vJCm/0GIxz9jc6pK8j2q1dNotBOkf1lXo9ghOr+b9rBDBwwg33cqWLaf8neRFd78lPWiZlfRPNloTSvBwWrHClKs9QYXZOIJ9nELarhh7vwGBr1OF2H380uBnY2lm75PlCTcfUlNs3TNUofi5lrQUQZs/FoR9KOkpL1bMwvnyT1WaTHRBA1Lno1G0N6/15GPO+o+DWr8WMQyb8HVGGH+PaFuPisX28PiyT78wAnD695iiTFzyjlGYG/xIGGR/Z97LpN2l3IsBAqyhTiGOGwT8aqslrTdxw1KLx9OmYX5feqUOqnnIebOxT++1LvaSkrWgMLCFlwGxkZtemknyzBurDXarKKCLVpp7IyLfteGisV3gRfVulIikyDkm8teFSZZ7uwj8N9bb9gKd9+0HGRjYiaYJbJdI2jo6GgeVReJPUDL01q/g+TD2c8gq/qoeYvakrPAljAtJGxXXebK65yUmrNqzTvHxl6R7/QovZMqDIEzPYMys2S925YhfquYigPJpzOFfbI4X
		Eed6UUNPQz7alcx6ZTe4AmljY4yQep8PdXYdyge1Giyw/iKcfrvhrOXjobyhHXl574E1R8e3X/jas/juaqYYEiq64ribCfY09+t4fInUbvh9jkge8Tmt2mCyxIswN96AHobc+o5KU+LumIc9iAFF/p8ujhsTOhknh21XMeaWdB0LWULgq+gjz1n2lMZRRgJ/EUNGLAQ+Pr4VNgL+GpZ3jebjmbAAeVrY5f7ntYmGXle4+PmLld2uchLnFkVhms1QLnhttE6jHGOJj249hQwGlKIzMsKb/ARfRhfLwFq0PqYtkmqvZzAK89MjrQEiMH6e9LhLrPhJNvgBXT69EkGT4y3HXAbsPCSYK2iRiRapUG3+chhDJenDt9iTpRX1tG5/d9rG8ue8IrR+tUDzPlUvP/YGpmBzzwJP0ZaYQAjQ7NEt2Bi0Gfu9yVVEJbgI48Y1ekk6lhOThffL0fJM/9bNDo/22MbwQzqWEPAHpLCwuDWRKTb0TfGBqMBE4NbKZdauzeMUrbsRrbPITeAlcn4hOeGufxjN+2u9wtS6H8n9MHrD7GygAEOmZR1GOp3RnyF6lhq2xLnEH6TL45Htz9dNnfGCX6bfyE4fkvHfU2MPlmThP92zbHHZulaU6d66IXZ74j9u/9FpjrmyfrDTUhdBPo+Zz3zMSriLG9wSxlbat9ZPQ49VO23BVsQNGJg67i6yD9n0zOimtQyN1henKGKRc3ZZ5Mi0vPxYa0F5/D77ySLFh5shxvJbVLryZ82ssWt47RMy/rK1xv7WSJsfhD9eqOb1y/zg9OcI
		RD9shh9rqfVkVt3dnq524HZ6mm0y6b0ITvsUwN20GnaZDLg5dByd6MH8CfdAxv68SSKkxCi5kcLw6OWDNmqeDfE+Ni3si/VcUnlm/KTKFTeLVTlycqImw7BKBoN7d3A6h3R6MdRukYrvd1tfXz/W6DEdLqzazSYEBsektLPoeahZ3goqVNiVPDIYkTuhZ2nDZ5twV9B+9ncsNU8gIVss4629whKt0Xwmvtvem6OqNs8ONXOjylwbQcs2T04YceMvfXMz4D97W/h3WX+OG80Yzk+Bsif80HxkT3ZyeloNtrOmD3akdCXNLWdxWPIH/bf0zbHfOFiwO6qEQSJYu3P7XA5zBU6agTQVc5yMA0kxBugRgoUeIayIo8xcKYRKt3P7VKVPvBUi2TmsC1VGAD3rkU5iL7AiPPUri8i7sPywPQFSS4CXvPap4fW2jWF73+L3oNKkkH0ORhCRPDNtILIRdAgz3o8PheienBfMcstNGETjedFw3fxbnQP40fnEKRuopqd+u9sNNMaqvDxHDo++J8E2lD15opC4yM1WC4kK2duuc4mA08xvJhYgrbfPVg6+zANZ9esn+xMhWucIfDbYlHskpy1sU5wAtkpp0DisEYXxqDrQSUrSboDeW0Exek2j2tUerTIWrZBmIQZ+TeOrlWB39TRaYUNLSxHuTH95kFsgUNfQWJUCM5oRLFx5LQq5hcjul215+JOQ3Jg4UYn+4XXxKCOJPD3verk3nPrD4PN9YK48jP+DR8e7cINynTtAxO+zmHGI06I8AX7tOfdtIe12RzBmGgQC
		jQyTmbwFz4ie84ZTMA2vQ7w+TRo3U6JV9aA3u6JBlYvLKqz9sUTzCGxMYqtSo0d+YAmF4cH1OzFLwy0O1iBhf4dlrArrgu7nsX0C2nmbWZskyMCHUbiR9BsFXW07ByhhVQO4x/mqLe6sq6+NEGvjM1K58s8aP7/H45NUYFardxzQEQaYHHkZZ1S0vu8Rvjkl71UVaNK4fmtDEWXFFU1hgBqLrTTKo4wkSAQfhJkG6C7Mz8+nz1xbLHifHomlprK78Lt89Ga9GPJpJkTAGtcIeFNYiZFuKLWtNVjwTc7oDXNe3uAHQeH3Bda7foucjV7lJQ/7Ij+zT5ES+f7ucRn/MbhPgsgEYbb8ircgvc9Qf3q8Pa0A1ubbH81VbDylplAeddkYZVkM7ZeshHt0kw6OhJDVM8l+51WLMvPe5ZT+Wdz17pV2z1HEXru/YYFry/lFYcxcSRv8+UL+sTNOP7meyYoea3lpcpLjuAli0WtH2CevXzejwOC+hlUgzM9w9i4nvOunHtF53t9e2/E1b/3myiHZBr+edIX6KgsBOhTRTJau5oIH14CJtbyoN4UUtZw4pttTP2Uj293C9Y7DOsG13yHo8IG/kxRdj2s3aHN4t9EUewlUqkKqt7sBwGp+I4xwQIoDsshTrTUf6dqv8JayFC8s2X9dq03/c5ia3onFNnV9hkKCQ21ibuZfgom4mZzYEs51RvmhjiSBLWkyCOYXMD3XceZr/L93XgzgDHPrC8e6lC722i6u1PTnMpm7cN+rO28PyqmWU4pqZr67+vBGKkhMNrDEUuST
		FW3gVMlhv0DQZ8OWOutvgm+6p4oaj4iOzh1MfWERo5Jlh+U7O8BVl1VZIRXSDLfZti3fjUppc0ahWuFadVZeY6S7RunV6sa/BeapTOPGPExJ2Z6dVmXR9BWyG0VlyXRyj46EMLrRWXwwyrRd+U72ZDMeJ4QKDyCM6fKpFl2EAWCm2Jhy/cR+0lAOXHZk4OHyn/BV4CASMZUNTbbhVpaf/Z1gosgZ0snIxWjl1Sy49hQBBwMn5js8wN2Wyaw8g48ZfpXmkTNfIN/wzR/ypThtxan9nlKGVRqVMZfw94J4MIxMMIyIb8Y1sgfZfkRsBMiOvaSwdS2OGm4R+RrnJ3ZJF6tQaB/UkSupnmHifee8+MpOTKYSSNDxZolWZD8vsiDUVGvr49hhyr3KB+n3+dIFuqSkpONUOdoZMPJnfkePNbAsN131LAF1YfXKFGd+SUKQQlqcrnGJ+Bj/rTL7PVYz8W8zKL7pC57pmZ5OxHiiul0j4hkZGXEntnLQqfuUnfjR3MkUT10+L/GKBYyoyXJ3V5NdjIgP8G0lHFtLIqPUUIyn6v6QWrud2YjddTc1oO1wVVRnszIwRyH6XgVVqEODLB8r7vrj4PRzeAkBkQoZwcnxGy79uZkIiuqAa1lulc5JIThD+8nioqvai2/1xvG4HrEmYuudBhG927MgOG8q52jDumPqgloMju9GuNgTv8qOxxihuqI+1EyT673ey+KJQPZPZydELAnD61jmZjtAQnq9G7fS0mlhhCt8Y8CU7W0Z/TiIZMlIPWG3ByIMg9WjmE61cCiMPeEB
		mEKBaVV5Hcx/zgx/AB7IXB6n+FzT9ZCpPmt4EwXD8tcmc/bmzsQOlWlbb3OATViYDcZ6aGuTw+BPeYqHqi0fP+rxbe9tszCW8QAgjtDC4JRxzzVzjnNPZa5bJd4zJMRqlwRfGXhwtu2+Wk7h2grvPKUT4kExcbS/SYquH1rukLYyL8qOljAsm+aPjYCQkV7T+fZGHnpw7Z1twy3Wsov8FDxW251Xh+cMQWVdXd07P9rdrFfa6YRLAzcrre1pM9P9ZyA9pT3Rf/P39DQWR5ugQJzV5z+WbCUyGECy++WbnV9aShe/lPSdUl4GOIYFbStu+o1A2qhrXeXl5eaCfcKy4aIQq8HAYOxBr6tkmZGmJkNuQyaGpkld7XN4v1pJRkQPOOdpbqaShe4/Dvg/gngIE/Js1q74YTk3C6t+PRXS/bhTh5egFatklaUvqhvhwVID5k6bT1DHn5fvJb4oWu499x67JwPjGM4mKLm19saV7R7hQcncXHH+JyJ615r1dddD3GCjr4FKaiu9nVf04/nfOuq8vlUhI3HG4sYTFa7pOy+Eqa5O7aY9CIs93S45RkmDM8PHhB0jPYxmDJhK+P5otszQsS6gi+7W+IwbJu/k+k9PS+jf7VOCfqOWmSbkMu2FXhp8YpYwHXSxms9hHMSsYajIHF3avPrKGmaXaobnt5uls3pK1O9pZWXFqiwz2nj36kS3oxJi6qUSad0yhjsFdVIz9QSx9xli6XIZ36nikJOxsNCZ8/zWrSp+6wbJ1XBXthYn4tz4JMjdfPrUyfFD/GNjEBMnkmvY
		pDnymCn31k8gPKHZOlL4tn9xYWEGxq04spOzhzWvdQnV/yQ2kB+yJ3H8vQYNq1odJNxlFdjlXyehacU8WRoiIn7L23ara8ysVTRKEwNDIQHW+ZZ418tL4K4MvkQq6q6xpEynHRfd8pkvaHOLxPzipvuk+Hp05MtW43LO6diaIbkzkSOXKbAy2e1CxWlFyva2mw6xMmHccuMh/t8bDxwg7fIpSiC88pFOgAE51tyF7ZKCEA6cDrgBhrOnyRcCgQn9aqJWuQQgS1DOj5mZmQLEL5elBvpjZLXOr20C0xH7Yd+3zgGzdNiz2XeclaffJxm0TH70EQfKgj6JBQUk1n6ig99kRV8jI1YyLev72l9+p5nNmcAUVdMan+3LNhBHdtvi3W9gs6dzR5sDa7Zil7pDA7CvMSlx1NAmKJxUK+58xlY86Q6P/3R3zRiGL3x//p5RPQW8CNnLN9fPO1OdR4dlApx7EQ8+X+Qk4abPCxpn173H6zgOCfQ+DyzacgwdWG1HQQ1ftmR7stxjLqAM+lgW3wzfWdbJKbnFrC0IY7ij2hDOY2Q0UzJAN2JNQLij2G6w/NfV6NNveaDNjOUGWdPxE1v1DqoaFl2fv0HElffurlggMWG6b9Aw0G3PAsuGHPF+9G03W/J9kaUCDcDG6ezk9LXiL9/ImC1Ns2rDssB4D/BylZtgtcgNH2ZLVLGaj/dJ09n4W28xcRijhy3pweOY3XekTAzDPFth98zvIsNRRXfPw2CwefUkNqA2wgSRevOvhofBG5HHpB3bec8/FeUtqDBmZEv49M8y
		sleT38PEek+vRe92K++c3+PZPRs569k1GT0R6jNhb7v/kNwWyVLwFIXgAbBVmqVYhAbHtDlcfBly9lGe2rKzyQLjffB1L9amlxjtTUwPZDkjN7xoxH35dix67puMskMdMpxStkOcnNrbkJk0RqwUAP0NJQuQuXKgUzA1CJ/h4PRJo/j8BwPKSaPddt/69c+uDlqQgZk6GNdDTbrX8zXP+h497mfbjRfZ2i8ZJmUZOx0eyh4LM304AcELK98V8x1/3GF3b/RFjC5qn7PZ6UPUoUAQ44xyKgrc7PNubEIZvpQVgyVZJ8wMu71UjRaBCM7Z1UCF3lPBYKSpCmP5facD1sPl2HTabJqES4KgwTs2g4veoQRJCK8w3B9kLBlF0PWR9QQvRRAE+Mh5EUV+O/UyAshaq/yXzwK8NgoWtlGsi+ZHh7f4NHzxLjI9E/fpdxAq7u6bzirTrTKwf9d05z6ZHyhpPmv1DRvylZ1TMkULAoeE/hf2T2bfY/K7SudF3Uq2L77FLV+ZcNdKFTBsIfDl3t4m53ojZ62z66I/p4gmmr8qgLnAJvV1dcwEkZtusU5TB5FukzOev38L3EybThjE68wwPqG/Jy0voWv/loLXOnr6cQc1RFW3RBDEkXz/AYsZR79u6yAvfmbFGDVBzT/AzkDl88Onjk0pAlCyQWHxvMzmbv/lSATMXEJzyz3mBCb0AqCVjo73oHLI7nI0Y2zxcEZPBMzLFVYdVOit4553o+2EikWjLQ5unh3vA5hwtj4VqEoOqpzt5FdnuzkP5ix2UTvk1M03CbAq
		P1TDUl594NWa++tnr1wjnwbBRzVjmbUmFKxUhDPZq2/JNuwR0qpjMJfNwPntpbj9pQ2jFBXH6vM8VapNMzAkB3oui/U04SiJ9GJ4H0JP7xlvg1F5TL3O0Gv4nfENgIssSh9AeGrMgkbzqQf+Mx0h9rpISuXIO8IcChV2Sbh1fvj155SLXQQCJJQsc38XXqIReJP+Y7NFod5Iuejh8i8IZl8KObO4cFGRPQ6ItJMROTl/YyMiwBqJEeYhp8qKxFeNe/B5fEyge+9dhxaMyZTHxAnzldV3Cc5ctWE0pYt+N9nbMhv1HMxMWALgKjo/bzEy5Lp5VARHgkg+fmWmNwCJ+hfWG477ExXZ/f2Q4G4qrIL5u7W+8W7P7nuIAF7HD9rbIf8JrPoMLrAqHMXxdX6NsKsECQoA9wP5GETCRzkky0IR56XXKpQXy8FwddyHE0ORw4FDdnSe9Tn0l20a52/elQY99AhdmWxTD2ZHZuwi7d3ON/n2hpKGptMS0ciH1zB+9r7yFGdexy7ea3jieKMdZGThOFKegh6JAluZe1bBh7Yw2WVUPDCw4RJ4itzFVT3RdKw+nXT0Z7/m5PnC6SQPj9JTAgFYWL+bhYEC3v3xmsyAagyy1Z/fJRrcFxDTRdJrK2ScnVz9Em6GeqwCY1wwP6w2PlEygcX82cj+2iS9x+Dt91CQQ17lhMj87RzAUxj/05b5kBIAUz9la5SI/t0oCAYenlOH7y1cp5+TF/20DfmBT3Kcwo72B1nnn46Nkla+7oCb7P2ke52mx7fCbJ2ST3nKJ+eZgT1L
		v6ZPVHtwNPgLHk5Hkztq9kL+QmklOqejCPCnPSQd12MKc0r8/bJsfocMK0dmM66yxaM9oX2mgWa7VFKb9dpBAKhMxafBfM9IaszLcSyohmNTCIZ6fpqPn1yYBxvzo0qHEiP334CiFbGgbJn5BQluuI+mWHqFw/rclSy4xUBNvTOFy3I639UHDevKmY4kiCgAGwCpDRMedPgNIQfmYhbqueFMSOArZaCDidCVVkqlT5pFf/2kBnGA1CW2m+8g+2XzUHXEXh6kOGv/KinbF2cOtu4ovnRDiNEsTq7bzsNhLl3wj807uZg1l/Axm2lfOMXET77TWpTCpZU83dBU7zQiKD314iNCZTBNDnVKusAGb41ydhzOcnYoUsEyemtpwFDuLBdKgE1i/tTD9cD7rlC1vZMjHhwK6yOAUQQXE7YLxGF1Z8GCehaESBB3TCWNZ3gp7lwDnZ6+lQgrfk8J9qP1xSy4WpTrZowRpkXlymCCA9LYTxfS2C8LTSZdsGPhvSxgesEvaCxHg3K07wcChemYnjy2Zhsytgjyc6Z9+tdgnrGwF1zYBjB9mCEPk6NzgPs6z3vgWWU7msOriRMnRrj/x1uxxeZB9gSAszZz74IYdPVei3nCbJzNe/9BTvSO40JHtOWOFKin3YhCnsoaS/8+sRm2aC+iM0MAxwhx00/olKETKobUhZLn/xQkYiaV2tOpTX9Dg1pm9XWEBMkQ1WzmZcQAnM86xaFEOKl3ZahN6JUu6u9hc0M4/KCnYVXm0uFOIeSFTWGTW4eMdLDW3VVIh2axiq+IhLqA
		wfV+fbpWWPQ7K8bzTE71cAqHJk/mb3W1eaPoPrIt+PPD9akHhW5TmEVJyasx+FAUzEoXizpeQaSiws4kM3qE70XOzLL0CQHmUz4Xuylo+UpmLCUHxm6+cIY77LnVWzC5rVscy/W+fHObU4mxPsnrfcr0x20Uo8WT1xTnjbYtu4G/JUdSUUCTWS+Z6GEfs+seqzFB0uB62pLn92f7KeR+WoTFGFxMYVSEd5yctXa8HB9Zun4/BlzXde9sKGe0TWVtQOJaw4kuc271OhxOE+GPvRGg+q90O2yGeLsXg/0OYvsIADvUwbCLZdtq2yZajILnMYim1pbMhLnx7+AM04DapCVtGtCLmV6KhLz99OS7RgcR9MgTtdD4EmUXeLQveQGGQZB5eP+CJbH31MhdZjj0RtrGORRMhTlnopThZfrfFUeSTmTQfR1VGu9I9R8G4VfJjgQV9ElvaUBKJE0jDOFS1DhRLblFlNUZfsoksAAsUidOO++I5cVHqc8BbyKBWGvCb1hvqunov9JQ1rtjP6LRccBqcw2NSJsppI4IZJc8TcDL0ieTXu/K5Y4UMs3HO4Yigq9+4uidex5wS40HxcEQLt26eY1cXmhQG1JgrxiKX2moDiMyBK1UqdK/h7l6A5p88dJ9L3p/0uq49SvOQy12m/w50pjlySv7lQVRwAKpIVpThnKZ00IcDAfbmW3WXZgt8nY8cMrlRbSuQqC1ImE+S8XUUZyd/GF7rxPBpz/mku07iCm/VEAQFZKCBM95eIIIC4uP+kdATn6UKaOoR8dj6W+ZTz87cfuk
		74EicLGRRYUmJKAfqZslv8Pmpw8j0iIVCukyGSlpszSgiNfzbOxFWBse7J2fZN0WxOiRfO2DpnG4vpRPtcoF8mYspju5ASmCRD8JlPZqCVwI3uVOel8itRgbmGdN/jL/vfaoQOKEPOBqMSPShHyDtS+//z6HoZstEqWbDf3wg8AnVdyRki1c4fuOmJfb48gor/7Tj/mBKfeobbS+GYatnaeaO6hvRT0r4rAAcVGIcU57+wtFzcvTo7yE+8wV37AzpPBqJ/exgu+d68kVf2LR3WXnnDd/HBXPI2m/V84807S2RViKIkCoU2c5zf7JnOGnpSL1vGHi34P6pmilIOdZcu/Wep73da4dE78zTZ4UV0n5navG4DMFRFRxWaYtFGXmx0eOwVeqFnncGehANu7MO/WhOMkfwTLYrbaL63rqipPPNatV6aNUVMauvvm7d2aIj7GW/AZGfROV2NqucsnziJXkADyAqdSigLTJLWYqUSnWsBwc+cW6eedsc+Ix5LvvoSvTSOnJHvH9VBKiojVNwI36KWoGBPMxGFNbcZghLwDQ9v92rvgkxmNVKPUIkyPg97ZuY5RWO+sxNE7PAGgcjyLEtT/I8myxe36ZK9plz+Y6ZBonOlD6JXj6PYUxdE96bT9mNe7vQJm/zLHp78t0f2RxYfKj57XEseWOQ1dl34F4KKPNKNqqsOVbmJ7OlFlJH25Cmh9DLFG9Ve4QA9cBZEj2+SgMnMSkpKRiQG35n35KV33hhzXEi2wekcwCo7PBXfz417XD4XeZihTjKApojK6PtAqkhwcu
		6bPrcjX9Avq/RwzCdf8S+f9k5hGln7ZddNEyNjbGg3Jd1hT3ChZanCAtXbq10VLQ+BTm10FBY7jXub/tUy+d5+WKLTLLv0sLYpA5sWmtHwte7S8GeFaXvM+6bGfb3rN6nVJmc42I6rh/BAx39IEW2pfnv/VoWMeI2XUMb7GC1cMGfipw1WsVLAvshvgxd5Dztm1Hrq+IhclfcmaVax8LNBReoSCWU3xeYDwf8foVtZwhTLp3uoJFrpfX6QvXGSC8fUFAzQVaEgdbOS/EKwdAyNLubuc9q1vGHZ/T3WOaqM+EXZII8i/lYLHKjhIucE4FyOA6kZCv4ur8c6asRGMWCOCH4d6bUZgg4DLtUL/xV0LYtV9iXqWVjGpYON8I2qABWMeFxx/788yCb6wVzMrhz856OrKaExrq6rjeUNZWPETRN1znGWOUgUR9ipNN44nWj4cDsFYZp7fcaUaiszD0/qhTy9nUYaTwxsjkBW1+nB4dHX3unNLx/mptbW1udjxvjNCliwM6L7Rtcb8Y0YClvsGP/ek8ND7CDmTgdCGNYQtjsWMJZk+twxNHVHvZ+mYKWEzS/YiM3VnwKD9Ezyg5dUyzOvqzbx+goTPspAEa1Nd8H3+cHqR6XypBSqdQRfVY0GH/Yh9RNxA2FdsLnPA/Io1LdUUrn7AJ7DVUzTCtjKxxw3JZ8GQiVCrXCwheQRZ5lBVK331yyudKoHTRYkxkwv5kFTxOuUMyVI8xoBL4zLSNCJvAySaVP0HzA1UTV4I7LrkgLCbc+Fq1UalE2kyDHi9BecX7ZjyL
		/YKHi0sQvTNsMwdPiSE96fHZ4cNE7A/Sw0Tvbg0sN9K90lLuIu4FpEiCwfU7MnKxEd6/Xzew3EsrUJRtfp2vXMHHdyXoqL6emZ7ExOlJ8V06oFrQB2digrUVb9gdGf3grGbLBb9Bx6F8Oe8W8p3edwtoCDrcWb63azA3DHHcUo1PPqRp+e7nsKt5+o6XrZkzrmqbwcHQKcTT4ysOvLzzwoeD9KOSxMBcrZQVAQJ9EzWLU8f95hPAryP98dKcFwRSRJHQBQ2V06xlE9RzvoWL9N7ayjJZPVMDf7BBpQXBZ+AUzLbAUd0Td+IO+K+TOny9QuEbv70QCJruHDA9KfI/zkRK5FWw/jDMMmujSl8H31kz2Zl1TdNS7knLqbjSa3aDy6WidKL4rPX+aG6iTSAxVamIAYQyEPdMfMHpd0mFJHGiEmiskU//xImJRau8uITzfPs77dRaQosexQWnEAwN5ydwldSYyEveJ6eZ1xL/niLdAx7Ksl3BK2Yd3ceQ/iYwPb+MUsSSkocwzPvNo41kaBUY6/vP/2Mi9EK1bO2+Da0cuNwKIhemH31j+/12R/m45YtMkQvoQUxPb7nm4aucS9JzxgkFkL1C1zoEjiS7i7Fkmv5WC1eeqjJDgoWQvlnAqkoVSusUnDg88LMKadrw6YIo4m7XX+8WpaXlVAngnV/XZFt4F5HD3HzcXE4M2D+6e2eehox4rYRxGerhaKY7TnvHx1O57FbBffaKQfeER5mXVJx2GOLN79Yvz4ktUudiqzYq78ryI3FP8aw153E4Q7QP1ZqBHS06
		lSn6yDnbv3l+We/Nf5q2MjfXiHSWL361GFgyw+42h7qo31lO4swfRWrWq21VhKXU5Hh0FVD+jc4TkRTQbrGqVk3i6/cgH86TBMyoX/pKtXIXy5UtWf2OD2crhE/9a4pOGjPDX4LZZllzB2rqSauxe789dp4rqH+96WmNs7zqsmXJxqXNvhNVDG9xCHOstdMoXwIY6O19qypr35/LUeRRAx2pR7dxP1a7i4Rf2LGnm3P2EUYYUg4EZtCLZjy3A5PxrYOplK09D0SGmE+qXiQ1TX0LcjUQrAqWWTLpR0jMd/I/0135xulxFt3lTuwpmN1s4U6/wxWkBW9QslofirDzu+ye40vV/ZYVlnNakn2cRyPKCfqdiRIH3Xj34vE4Ey49zez+tKI9mWWXvHhFwM2k9wce3H+666958vnFX/htceMUtsSjrVLQXLPK8WyLyj5v5nJ6Vwy+LHhxPBqIPnv6Q1CQXuZguNW+X3EVkpQsG3lw0osEyBSx+WXJOY/Gl5QqD5G7Oa0hzerIZtECimM4IwgFLb78yvU3/Of3bAw/CJxkOXMpkmOW0bk+eqT8oK0595v/uaujttBhNbKUG6+9/XEsPupE5YfvaCpXiL3Cu2wJFH2swvndmGOtnxIbioXrVeGq9ZRr0UokM9XOySWQiw0PM7esclmTwUx/bTqufdw5jHrIRT9CoW6D3qzzIsxTdVOT+1Dz69SNGlUOOXAGxrTj1tB1bln2jvaXxjHm+B7g0OwZJkJUqDwY/WU+x0jEhJo5AcelgJ9t8m0/QsukSSUAaH0W2IJH
		zdT2pIwOwMRezzZK/M6KEFTgfSsFMVV3n8haflm3MvNstkNcYViOg7tNmcbTabuO46bVx9H1CSb4nqA8DONl3XyY/2y/eX433r1+5osdcwMLl8hmWc5T4vvAf9t4upFkHOpt+HV5OAstt/bMp+YjXN0lFIFft0JciUsoXTVDIowytiHIgmpV90W7LfFvzU2copRqGpWQJ5sxfFlUlc+8wt+/wC629ckKA530j9iJDkFo3beZATrg+zFgD/Ef3p5AUM7E3vOUHv/xYPE5HOzqLOasu7v512ku2K1B/5yUbAkJzsmbH7AzcGbO4hJkzOk4cLdFbg6LpWacsbPDm96KJiCCbl3tpoTgudM6ckw8+6WZlXgX/HQ3G/ummyNBwF5v1mynAmeiNktHu58hGNNgahp+Q1fu8zZjmeXqeJPj5Ez77AOT3HljnaWFmQdhY7Xi24iRMs+oQ9tvIX0CqwxUop3a6k3pg4+fRPKOgmaF8jcdar4UIGj/WmThvGVzDLRIFZbbfajtWf3z50/oJS7cn960QOdZZIkwjZspf9L9/SH+N7XwGtPgUA7Hyn5en2YEzq9/2YksvzohMLo5bAoTY+f8KS5nQlzbn0f6fus7rIr55/6dYwrt+EP5YT3WBKt6hb5g/Ni1Ba0q5sTriFDpfkB2TgdG+cwKjRdNtKmbhn3cH7zCiqLvlBx1dbtDbqLD35S+/HXg2H6OJwG0JPK09H62HgkwtdIp88Lp27Is28UWXnU6ydDXJUJe+JcJfjG/fP/+fbU7V30FOMO22q+jhHi2VguTml1v
		WPpJOi2aZvM3NvOhdf9tz+MsGg/yhiRfef/eKAqvgynwqxvRVJ7A2KmVqEjp7ITQoVkJi2WxwEAyZjVl9feCbWadyRHsfcXExBYWdzmJ7vE4fX3UY/LMha96z4Jj5zc5V+MoRGdkHKW1UAnfETTufbVX4+quLr6eTydL+cOovm1249aKjPBu5D1eQe0KkDxPx7igmBhTlXbGuSzWLvjZHO6BX4Ods6VcpyT+oSGl1VbC/S8VFVUDR425RaG8xASX1eiGNA5Wax8dY9NIId3fyRY/f2N/NdlPn6xS0D05/X/9TR0fi0w7V7fCRQf3xv5QQfvKmywmvv4YHhsg6zyX+laW/uyRJncuLi5XpkgSphbKDEYLP4+F93R825QIgbQL5A6YDewGjKb99uqRJVcxUlezxhOP8dz9EtgZAltSIo+iXZfalYpV+uF0hG57mN2EigSirbbd5pgJg/v9lItR1vtIeoB2lfyHx0yNqIyWFJjz3bW/lurn0P7N1fOcglV4LKOZdq7GgypoOEO3ms8pEf+0t6LVlvzHgvuvBLhTO4eH4dWwsgDJOz+gy79QTc+dJFyrzitXas+npHrLctRoFEKQLOuCG4t33VWvbEnAiQHOnSDSYM+suvt361LfSFba/qFZVwnccDkr1SELq7dcSF3rgWXuL3szu0JKsoYDK4I3U5pHSpoWv5UtBJPFLNLhr+Oz6/oKy5yAXx2HnSM5dBd+TY0fqKS147BAm/5JWtOznqarzsuwZpnnhRgj1S7abIRPfGwt/N9Skw1Qy1iRaiosOsyce7mV
		YvuogEBx6lrBzwY1CskgVJSEPcGE/rMOrkS20YSdi17ZOezxYuFXJsJyOkavuUK6GxNhQRtCMfI33PiwyO5G+jL3dJwF0IDhbnUl31/aI6yPeMdZ427TzMQtmmaLUpr8EnhDWOIxMd2XE4tESOI7w0oUy3SJ5di7gW8lPs2N3fWoErCf7bqG1PkS+bQZjbntn9o7zsMge+P3tdqRcnkndjJZSdtpnrpjnHCcHX+5DhKQaWIbWXGWBNztOkVeZEZp+RZ2d3e/VjQ23okB6qMzfU5L2LrfNjPGBvkfjToGGMn3DdUT9Y3AoAxbxddv6pPUU05gIzrDeFyu35jtZRSKP3auhb5kFTzvUqB0HxZRlH60aDg727NwMaHE0QSLlivpNqIjTt+RGiNvZBLDcWXK3+bFY8BIQeHjN7MyniE/6IsgzoiMjIxiuxw3s6J6C7vK2Nh4jmeM4UpvWBfikx8M8vew2o41N+1jhk9+zrrJQsWCD4YbRX6sthF+P7J0WbWWqgwa5wDFRW6WsqFt5jmycxR47L99+1Y4xLVXCACCTaa9ORrNyHcNmV1WKdrayOhfVwrecv49hGU8qWCDzZz2dSIxL8DcwIBe0rL7xXxsFZuy57Ft6C5tDaXkIo8gLa/jarK/VdQxSwN/a7hoWNckQcv+EU/ifrituiL+IE5Zgnn4oUfXZvTe6t/9ToR+5CPTY05eLHNPOZhBFYu+TYErOR97BkIfbn1wAuYuMcyeLwe6i8GRm7Vwd5ZQmjfYtDDJIQEP6x/FcZmNrhNHCRny0a20IGIfD+Ne
		1Rc1HD0YD/PlI/R6Mv5N043bVSOOTG/KyDkb1L3+OmmkGHZ3eHCggD0h6TSX+kMZpfTxy1YOC5tnkg8/+Z/MOhn3c0UEx4OIviFhDUi2uelaslZzuRXs3cDF9nAdLvXEjdPcnz9nNkCmhnfTAF3TjvzMEH/nC74pNBJ8uMJHw4rvmFf4nZdzlJRWVp3WdsXeXjc7MTfnlsaSttCjCP4BeUH32w0T40GwMqj7zfTYNOvjgIcCX0uzEW0k8OinQgZ0YqM8P739ncCDabHyhReVfvvNrLMG3B1/hksdooC+VGdN+usbCKQd07a9nWTmtPUmIQ5ePEXB0Zook+B8RFwU0/ferXD/HYjhaqj/TrpdH8gKl8jVTkt3+9bwgOYnh7vF1FhneNmHGe7JucZYQDGsXVpD9wMZsXpzzgEfy/D8rgMpbdZjwmnTuq/gUXDi61VLs40Vge+Hd/L0eSudI/TL9eO9IKXnmoBRRqbP3PVfLt6CsEDdf5QdImBMceG9BPVSbJA/H6n453/+TJip/lVZxrmlfJEiz+vQevxUMZh2nF5eXt4z9OtYCObkT7+R5iwwy9s3n5lwXhwQcqu/DqnLW1D1kBHmV9APaSFsdtJ2WUXGp/7mymw2MlusR0q5n9q0uazdnAeJi4l1JwFyi1xgJNMu7cvcgb6P7Hwc66wEbMMyrFSfHK2ChuxHxd/f079+HPn4EGO4mdmL7LGiN+C8TAr+Ozs3d/e2wsuNxgcUqzyUlsJLNYpVAv76fEuVlE6TzYnzUk0GY1ReXgRr5MJFkDJPx+ImEhQ4
		mko1LJ+s6PPh7199K7D+eh0jvWnJYbN85GarP0RgcfJG7qkzhaVjxCtMw6Z9PK8PonvTESMbiVNzetxRDWP0LgyuxArE1pNJ1F67WEjnA1bFvde8ZSn5eP7bsLZOPajtlHZAYOujwhus5WrbZb7xH9uwzRj+iqKeno++WBOPHOuoQGTRnbHdj1OWL5W0zlMOWAnVGI6T+4Gqisw96vBUbdO/uwoWJGL8KdLUf1aWTlNXs0bMYiB/fFL83VeujeVuS/PEG1mjI3Nf0NcnMa44YgZ+YmZm9hehqIQTMXv4C0P4pWVbzZg/DruVXUXIMYKDqtVbiw1uOcAR98vJE/irvEECsvkvw7DNj1FS9HH9UeQdO7zj7pG7ksWCGTeKf5aWrPkjLxnGDOXbsVE+vDJU5zH1fOlTk7/cwuqMy0IvJx6IP0tQ9syLH86LrxgNOvNHCyUH+rIMbMGIqGK4yI7XFSj1pSyUhxgpFym0t2+qGx9Rf6N+toDnMe3KUj5I3vyoNuJ1uVBnpWjSRRv96RxOxNh403vkKVPuAQ3ZeN4GIY3VCr93dZQWbjslEluzwbtorSu/kk1w+A8/cd7fZJtFerOXrPz8/A6zrl14Ijxh4AM3t09YSkemdBYMpJpVksVjswSOSxg+WlF50JFsLuJHl92rZ+N9UwA9VRtegvLQt3R0IAoae8eh18+b6D4BbBwcF0JmY05atpdlv9XsnpL+LHRgR1cVqWUehfi3axDVdTw9ijwzA8Uc266tJy8UWMsbvefL+wMDlq/3X21smLFFrWlB4yikChIV
		Mscexk8TE7h3B3KPYzQXJc9+QJ3Xh7k5DeYuIm9ykn73zzJa71CCy3WrvohLoHdlhLFSCQOlWjVmYHrnjCQ9X1rjGGTbp44AxgPiiBw7IH3+Zcq9+jt2tc9t3h+E4BT89niHgniHpsNm1nPZO7+oDSQ/LqsZEqSzL8Bzyg0zJPFZcS+noY2/8sGFlThqZ1A0OaTiA0P7vd1v53GM2CqOuPIEZcWPkTWpEP2D6zft+2c2C77cpKSkSZyXWcDdJEqzJA25t6yDq2/6Nurz2SkB6rcFxZEo34EfLhW1KBXDtXZ5qiGbH2VD9xKgmcLVbOG16Y7vQhHKkc+ylQ/yRkrz2NbltKyDuJ+5HeZNWesSvfDQVvON3FsDYTzzIE9nwz/D8B8pvehNC2wW1Uaeyq0xhaLfU73C29jYsOKLPiH62Vn8Qtqes1slWlU5iE69pdoQJbp/89W9pa44b57Opy6J65pWjB6vxqYFuxPpHTFxR5bFa1wMHrQHaBjyNdmZBV6mQys4UWzvjCfwRn1xCu9pOBXu8STJ3rLRJinttRig6xM2dzK5Ryh2Ce9BvdPv1jzuzJ+J+J4W0vuFB/buDdD2vtB8AJMfo8Pb2lWDdbECwXQ2Qhnp0n2rQYR/BadUuC4VRX/d1HS56LOM83y9HuIa+b+bfvYk0VRiEqBg3NzcJAGNGRBRoZCNlcOrp4eawZsEuYEBrVM5dvLe8ZFlDc2EDt8MrUcUUPEVI3qeaovNoizQykMcjGFSdQdDgR8mmJXiKwbG6jA22uleVSC9u2ZdOkmCrR06dXNi
		q+gZF9ClAjX4UPyppKdGM5hqhAprhb/zURK5wjeciUUDluf/efqPOqgZ7t+dm4DID7XhfmzmqOMYsdnAaO/RdfNOAawOFerSRWESCOKQUdtS1O5DzTe9W6xZ56cw6yMAQO7791kAVuAMP2PZuZXisBcDKCsrIyD8fi4JcPn0c/xG5o/y+VB1eq7O62BcvgLvoPN0JGH4crL8e9oBQVxfAZy/itVU/uh32EzAdmmVmpr6svfvnjqcjf88oIePsicDqC7+MIvJ7+rz8d7ENYn/BgWz1mXoPJUErwMn6G6Uv7T5d6GWFyfQMRtE03wgwJJXyo62uXBef62lOAb5z6M/oGrPFRiQck5IYctJz3hNOPDyajlalsim6diUDtHFFobL7TV5ehBUD9Q1CzIIZMIUBNguoTEnY4QE3l7vw7vjC/58p0F66E65urqaWFsfSQICrD8FiHG/zd7ihJzcFzlaR4B0110FVGJQN8zPzrWDTjwk7Z3d6RHKqXJK6ZmK4/m2PyoEpPDD+neWHBwcID5HWtBspd/B+KXQ44d5o3QKP7Z1ciI8e07/seuIhpy/SWgkA4fl+0qbDaqfc4qlBpy0aau6tI8Uty9RxMQU83F+kmkad17OA2wPT058DPIPTvapdYLj8KFeWaEq4y1MXA9bAOp1uL1VDrl9yRLQsqpZQuy87aWnIO4dPx7G9Di79k/4qY3lQ491H7vHRVpvc6osU9ab0s2/esOfOR87Bd15TaZ6mM5j4OAp8v3bI5/60wePA5FZ72qeYkJWvyiegFJM4VyrKmRBtzat
		4LCI6l1spZmjvXRUTgz+yKm8+GLDHeK01FSya/78puhLaG//251lpzBuKatVI35VOBzuq2UnE5kty5ni9co6n85Kxx/vz8SfRuSyaYsjBjKTUmRhrcTP1UHaiROEZr/d+GwpORvYLqEeK18A3bvyEdRzOPN2Feh6T+HOeO/ScdhUkrWagvpP7BWOHuumbDI/D9ahtSOfuXxjNN4wv/ouddT6Of6qbUBbWVv8NyOksMux4x3hap+nlEwTWac5VETsth5lJUnvRNz982odYAmFIilqLTKcznwWyuc3b4f0Jyg362LvYGFlnPjOFZ6WyGguQ82UJn2D6Rgt2H5wYysF+givdI3Q2iye/E6ZyuMRz50IeY6Upr1UeAL+TE4qEyLDt/eM2I1uLPvVGplJgx+/ODi9Pp/sbxlXC7uBaRiwP3PJtaaytWwVNP3IIsJei6QA62QosVVP0JV8zRFVMgpiga10qnepgfnPLXczHJd2clNetwfTJSFPkdI8vKzhRV/t7HzfYHkT8L6Ip6OZRXL+cQG/jxQqQkRq2aIjjXvDJ+9i/7lp/SO/6Y/PsBK8kCFAwFiDmvQctc9CfMm4ao+RG9ab8e+r3amt6GZxFxvQsdrEeW/1RcbmawQNNzVnivSUiCxBTnBxrzjqZPBaDqTFTzQbOQf1m9Gt+Dc1TB5mlh8JDI1KUsaMjV8n8t/FWXzlkOaK+LOgOfmF49Zr9TAHh2lugTy26dKRPFmP5vbtVpv5zorjuEXhoRQ3syDz4RxeqWdOZCxWzI/0FS8eM5dlT2Ers2Pq1QET
		DgOJDIsyVed7GEMvr6dzCmQh7JjZnDHs4I3JrxriJkahLzMB34dR6XDLKXUd/FvmYwtPNe/nPd6Uwkz+hYD/HGE7j+5ox7J8ha+sSv/3jMtY1Wly1TqMzgYzbtW3BNcvitNJvr1bW1u2gCSg2vN3URk5YK0FDDr3+subY2aW1M2mC19J1vnbie9Z/G+KzM8D9YKmJCc+b74UOVvae5jB7ccOKnW4RNTgrn3Rn38QDTXVauqUvbK/S7zwbzs0hTuesPl5K5mHKjNHPa08Xq480sLIAR/nFhc9KQ/k8tTjtg1ihrdvPu4KwX92ceyX/Yk/XFGMs/IYvYUInP4rRKl0FKeBbrlj/LpswpGy3tTURGrGjXu6oLKsei3z8zPh2+7KjK3zvr4+Jzu70wltZqHPm1SvGRKSkrNcXFxvY7w0bFfxSzzq2C7i0i9XxosPXLB4d9I9OwoKaIUmqFhefbcu76+NCNvfrlF8Xmi6yVMf3eapcVcbTZsHBjdDwRufXV1vtwsdE+Ian26jh7e5fwxEQ9BgCiHuexgl76AzTVJzXhlBBNLtx0hl8pSTcsbUIjcuViW/FZ9RDDaAf22+nBaSTKv6qJFerngCy9TCeDHd+04Pt9AeaxqfML5aW5eypMiRYca4Aia5YzXvirOfEE6fFYubM004/aKgAk2oqHa7Ngc76ZUyJj6MgLWdDmT3Y8AnfrBYICpHeVjRoc9T2M7sGRiLE6hubHT7sjuWYfR3nkG692VTIs/N6ith51lPD9gTEz4QQFSS8ERRLXqv9jzvuQquFgO348f8
		VmW4tvr7m0FN4KIiICYmBgxNg8OgC77BNpAyuXM+khIM1Wts8UtOMVtNGdBOEJML5S+0/Pz8r5F8unlhwx1DPxpQDGDs/bZOHHzelcsNd1ibEXSxXQGIgFz009KI0LBZjUYOuob8xkXFz43ZAA3pE4IYPbqaCq1tZZ9YjbZbTmocak8gnasmbqypYoPxxoqWxTdUTl6+rvhAlvoWZo4RlJY7hgv/WwoU4/bzbz9XzSHAkqL123OVHiRzgeu3zobWsX962qF/IFdHx+ILLzX09+9fdM5FsQteLHd8kcHbWFbxe+niFPm0eXLq4C0VajjAHLwVX5w5ZFbDaZVC6eJqes1eq457Svik6VV2JBJPnwnvAuP23aQYfhZV/XpL8QJxcFX1WjEWNnt6hBsYCBvgxeI9bBOenZ3l6UjtjxBMddtiVbn3av+k1lB8wI01j2jotwU91Wr3u83FZG1hDzJSE0itKKsxZ2Zrj1rXQEbiSJDYdtKJaXkTZfLyre4Hmxzwkzq65BQUhCSqh3kbgk0I/FhidcC/wrZoABuM5i9VjifhjuVa4NYUdywlztyUN35+Jm2QWuAr5TwDyDcmHStGC+CkNs9w5ARxLC8vCzKDmr/7elgn9G5XcFAvX105EQ9yxxKPWnPaZmGm2rf0vMGS3lilxReL5QkjVlqie4kM3nhAnFXXn25PNmV+QCIgRinARBwJ+Vcj6f+Odf/+S/uv9b/YOT66QY//6+v/sf2n/h87+/+s//Y/ov03+P9fXv+P7T/1/7g+/E/8/0e0/z7+/yPr/3Gwc7D/
		V/yhP/L8p/4f9Ff/s/7f/4D236n/5/fv+E/9v24ho2Hgv9b/g6v6d8BcBx5L/z/q/21nuHvpaiTs+u6u3BbLKFtUmWjVby9rM7mHZnwsIeU3kqVBDfKv7I4+McrWaiZunkfi84I1snm3M+XkscY56iRm6Ff5Hl6q8xzbLvS4J9RUi0E60Ya5Xt2qovh2pc38pdK6Var4UZ/ZYe/U12V5u3Cl6PGkzZzqKaXK+9HF6ncAgpoohAtQ57xUBrbBqujZJCLsnKhALOTiVzxS8jxCtKHZW7/Qr6JWpLPa/cGYVIC+skyb085IinHDqk8Lj6ev3s7PeXwKvdS0NEaYJRlwWso9PnANxuXeHx4JlaLGlp4wC0hpSW5StBL8PdKmfSgE4ttzX6l/eHiYSrnjNwvTSIeFGm1Q1/rZsfbhI2TPGVCHJx0Gw+SLWS2X15182bE1s0WqnK0uLUhiNchEZhi3Pvvx2e/79+/RNou3gBujH39oIR3OZn4ukBSRm3yffNisB6Sm3BdNTEwIWy81Toz6JWttF6tDBbg6xhpryr0e+APr1Ka5DAwLcRwMyTeSgrCUNBivhvr6G02a3QFqjQxYNk4uHp5VaXAWRc5itYBGH95a9bmk4Ljn78vWOOUhcg01NUFxcHrZfYD9NF3nzfFi2dDQUANwB+9n5cBuXo+3luP+gZPcnqRAEfl8qri4WDJUytxTH6ccBeGrra3PWyxvnM4F3bE0RoRGwry/qOWHNyiUL2XNzQ/mTemeDGZqMNo6OhUqMt5Ui7LPTiPfYeXGhrUPA8sPMxHP
		7G1sjh2bEtcFanKAKs1SSEoH7NozmNpMDNHwBncNpDt+eUOfl6kiI6iqocGTagXjUA592RGZmU8QBH/bUsFMHWjWs/dljd3Us+zaN+8nCsEP/mmfKS8qSbEMMtIJrmxU3sKToNyF00xGRTDdYRm/fBev/FoC3ZmG+czTLw75QFzHgyRkj3Q+XZI9S6A4JOrI4VEyqnBizyIzGcdcUDJwmFVYhuNjFYvvyV9GwDgZooDXfaAlF7PurC6tL4hXRoflIl8f33XZKihThJj3t9+x7t0WGIZm9VqYMichhUyn6mSxAvH25cM8vTYb++qEviAERe5hrBCYovBLRPlRu/o1QbthYPKBbv4yUFooQm4ko/xQSBKMoa6mxmXicFQ00Az7gYfHF75zVv50V95eK+u+bdZxbVefh+9vjwQsPjwRLQRWl0VGaAs17bhpsyLmckZ8MDWtT9M3NkzLPbMhIoW8rLz8JUounJdUS+WfhX2mw30g87s1sRwhw1u9lC+oe47mcSJGtjil5MgGCCIQCtJFkVYNmUdWKWTLscAWvg0yRXCZu4Kz09PXE9ZalFCUjo+P30duPgVAbMc77ceEGl5D7Zpsmg1oT99/7nM5TlH1C6sSqfI8Di4wME5YFaXgz6iqnenXm12Gcrfz9evD2Shzmb5LE12YSFL++s/I50igYkVzEjP1luvO0w7sqIT3P22H4r2SRmLeI3yMMqxdNtVIb55K9S2hMEIgDUl51J1dHhwhLy0q2h/+FU6k9u89KEhKFmXOgVOfxR8q37uRnpgz+KtEuUFuvHl1
		v8ug5EhBTH1utwimeVwntLLrni369ecS9TLL8XhrIhW/xMTEXu1Dc0ghwx7ht70TxShy9xsImQ8VVjDH+0WnLRmYMfk+XRqqRWEzDdY0qqNsIbRBN457Jsbr9ubmZpwUTEYqlD9LS7rS4HFYTTJ75FNz21m7V9eLuwiAgYMy7g2vmt+lI8d3fdOE0zbh2r06IOAIg6T/28ta88kjx3pEfD3sB27uRGl6VwTv3aivDZdiod0hCoc9xJMJvaw1P4HdUFHbV69fPt/iSykY89PkaLJmtDtcp4vVnvcHYmYi1MXExP5Wl9IGCj2JrcwL2qXOVZhvro9zG39u8AX5UDtovhXGym4hRQm2xRF98tTR0fnG5wCv7ne82KBTb/MK2xnh88hR89DvdomTBSFvyvR//8nUrVdM82rZZPHQZy3dC9eP9ZYdxFBp80iT95cqTn/MH3mpqrr6Ig18pd3x/MFxo/u8W/FJ4XolLSxiRQ1DyS3rnddud6hxx2zppk8zCqWMzWI7O36Yt9DelT9udlPTvTcgtNGQ1f9w1LKJ1MB1WPUYMPK4K0dLe/KMVLAfDec8oyhM2YOyWH9qYWHRJDzQ2o6XDcXZA/Rg3vG88WfZLtOt/Kck7cnN4q0wKhxf0z1naK48yzmR8POv+FmsiZC01NSZ+4ypJFgSIa9GPwgZwprVvkLlQYev9ek++43t9Xu9m7Pazcz1XweTkbO/Za47d/k/6shVNt9PnVMd+2jADldzS9N3/F1ZOZlttlDw8XlpeFq5cC8NWWX/ls0O0z6m2GG9fh11JP0h
		U9VW59Zr18087+DE4Mj5Su0j7Vh4yc8JwRpmcnuFN0LEdtbnnWL53hAp7UTnjF13jIeUYU2Y1NTUE7iz1We08hTaFU4f+1XkFq22SS7xqH5itdO1CHBj1wd5kdB371rI3jTYcJu0pH9z4xHAtfPS4lRMvsESZcIUXZr5+7d2vjFKOhca+KmD7iL3szt5+/s7Ijue+vWpT6+mWNPcBMUCKVJn6MSyo11dfjEmcYyCydOZDRy/RMHZyz1qJjrnYm5whmCQczv8YNeDIYOt/KOKDNy1O16c0wheeAh7V7/lVxjq8NeroCaoTnaQUWw9VirYDPF5mKtvY2FlPXWksVFh6Nwauwj0gYcUTSxH8ZFWXEzR0rIpexyxUVXOc+scnT+sTKy9FbZd0EdWstCakY+IiOCiXxy7ouTEwXpmNHzJC6+Zvf8Z2n0J+fx1gZa20gygD5R5w+RIESEMAUU19s+GWzRM1IaZavHoJF7vqx6bqUJ93IUca9maj57zEmkjRCc5WvkynxxcM8tfuyj4zSzJs9kXiZ+h4Pw2fP8W2Wcic3bz+u3xlQLG0cX3PpcCWgJ1L/p5J9id/uno+OpyqEFNc3KlqsMka20stawmG3gUZAmUbfovdybz7pOczpcgfuc5dHMII3vXwTy/oHVwjXaEwreDIEWoJcRZB1v4e11P39z3TRRtvcPkcpeYcVrbFFyLJpW93Bpba8vL2s3TQm1b/AUi/bbBqAlj8k2gJtMNC0jbhm+esIX25f08/sfCuJQ4BR1zOP6x9/qcYOSS31XMJ6GcLdF9Sa62
		2IV/5elM04gerehunV5rPKjbg+33v8XFneBPL3eQp8JJIr8OHa4IDOmHSeuAQMPViX1fqiwqVgpU/QZdXwuekG/O72KSYJhupnYVcSxdFpsxuqen9PH33RxkL7b22/zQX/zorlNSO/3b7FLWG5e9x6l4nyNoPVeY9U/n4fx3gZ3X3ClsThvWoDkp8Gn6zWXRS01d3bU+UCJH6671VnA2p/+Uw8aXV//1zNal7a/ZdlDNvAV/jfCeTGd2/Ez9GqPfjarGathWUbwnjcJHnsLznhjDS0CQ4Zu5XJSgMdQcqhrz8rYT6YXTDoTrZnwPxchufRU+MNx9pNdlX/2TXGXjT+oatzhxaR3tDgHLnBKB7vRhNMVaMgLHqwrCvamuBuayV93HxODvWQfr6WrmLU21ZiTMfE5Vs/R+AqOjo4fPd5fCJQ9ZmRRceS4povUZV1P6itT1zcvP/F6KJoN/WaaVw+9I1TOI5t6OX26fMwadmT52kCA9fDdvezmmsQmF/Ipn1NHWLrcXbhGFgeyxygcbml1PuzkWWTzuR1/uxPuvWxn/CulrKP7JbnCqXJJj0ucJIDKWlLpFZrFP/9kjc/Fa4CPMpGNGORDx9M/yXN5mE8BHoZxhzCNr3HhlfZGEBmvkzkU5hLn1G1tZEeJVHDlGXR+3ugGMR52ZN1sZZOmn5ip0qJc8A9U5gmhyppbHMXnB4yrUJl4X/jtBZKlnpHCfEGKOTXTqfB71IlHbfKLMXcD4ovEy9Dy6PtStW202WjN6IgeHk5dewxbDPDZpKFYWvREKsrtGdG0r
		rQSsM28a5MFdfUr9M628aWD3UFQN50CsJARTSsxflb0CIncO0ru/FmErO2q5lU8advDMQSbowFnyrJpXGJMpB0Q8Xjmx90vVKMBCN/p+gSLIrWG/J8Ny4/6bm8Xrw7gY2KjFch2F5iJOeRSv/vgRjxpijVWNr6yp/iO6TnNuRrTTdw9fdv20WWctWle1Hp2o1UauesEtdnM8rTZBuZxAtPVcOYYmtPeLEVDBmXG3qGBFK0LUxkMgih9cjM9s8kcp9wYhpi26a5afPw4SXRfOZJG4KrlW2ea2wvAJZFyy4+5zlE7Cbf0OttLlQkvxB9egSU5+4SAdytJrzrv2lajofGRZ3BBLhiSRHwTmlpIBkZphu6bvv/7FmOmqfodp1p4St5Fd15iDSB1ufeWz/yeUOG5hJFhORqu0rn2NzeETTPI92dQb39MrgajsBh9EZHpUMbWEEnrc1EnxsE+SZcVDpilyfFiElDtzYTv4cE5fhsa7b2pmci7eguPPDV4QkHtbpjspc/PB16KQxbHXxy8Id6z5l88jxyMeZljYIFztJsO4dJ0rpsAWVi+K3p+fr3PERYdK+peYytyrq5lgpUNer7L+goZRbhdQh2zfDx2VODBknntEbKAFY94rD6H+LoJPD9tPUn7XJGqx85O/z1WxUhHjZ63h6MJUW8DA9/dT7a6NbNb4X+Dqdq8x/aW0icZtBHDQwr35q8feKB2c9jsv64WCNyKsZkqJcAGKvA/tg57SGKej+91IADa1dQkoDkNYB3m4eOAa+gvYHKS2GokbBMoeksV6Ozia
		U5hk9zgLmbT+dBaD2XoNglKAJNkumD9x0MtVf05mpAbFpONCZsxtMJZ9pgQ5vubsSu4ynSy1sXftnSSy0vugObQ1AnwAMyYLbw2PYGRwRGx2i0Doxb536Kvax1aEbHpFDLSTeX72l0XJkIei2Ut9yaCScUFrxMgSpdyEFMjF2K5cbbJWbW0toZ6v5ZpTgJoen+hOqoPF605VntUPxqPPQ9am8MVz8eRtVio+uKODPfWsN84E1JrjD0pTuBiacSbTpDQpyli1M44wIj1fqkyB8LECyekBJWCef8wE04x6VVf1hbxFXf/xAIV/i5+6jJvE/fq1TLc9X10iEx7pdm3wPTi6LJnNAT9GeQcqrjRQhAdJb9yf+5QYat5w8melNhwlYYwavNiCthBIJbHFybUr9yKZY7CNk47m8wdJuZsxQTmiZvq0ACFjp6zlXfFlStaPDjqtqzgkGcYVsy8U0ghYpRhJSattohIOqT28dGUeS3tEbygZgjGtEDiJF/P4PyqR6dYufbYI8b0P/SHeR2ODAzEUbM2+oCFmq1YaoTF3WhrgFgVfQr62dzZ9+SHRU6eDr1mt20n4NBg7zQiBNV1NxZJWfbjdRvXuPR5HlN4Qt240N9opNNWOCEsJISIqWtquyn1wmtxHOnRcYUrFg5dmwwou+4KigxoadErc/GD/Qr6rfaPDQbEZb42828bAsNeZbLb6nc1MEKb/0CSqHwC0GZG/nSRLI/9OdJTW3qae5PfgYEuCSBhhIvSO3OOjkYrQZHt8Qk6HUWXkOnC5ahs431oYPFrhNLkz
		e0tvUMu4K6MUbZ5+vfH7fphDWdGeDwI5YU3lP3umvLQu82A6z3lHkvinFV0Kj733GRIUpY33flZFpIYdZoL6UMUIm74DlRIMBtge8iIqiT+SZ9y0kvHMzIe4OaDCIJ7SYX/2CPSsLlhZOo1SLBsNQ1TotRw6RhAvmWPT1cGIOlXzFrOiJW+H+UDwxrzEs/gU14p0zsoNt7zI1w+TTe4W2xxvLkztbUQDpVSoBmj4kJhjYXA8Rp3Rv9qWcgSndqSvV72jyOjtdgbpPPLFKYviSImbANFHpd5ol4gn6lApFDPuBbamHotgOYTgOg4HZS3L3d1Ss1MSizy5ZYcTvUzeWVZh6uwIWPNkLWTCnZKMz/pri2w1lSMWf8z0ZXpFt0ak1ETYwknX1mRSZlz7JMo3wCZEu8igz2tM2nKgiPhaMw9aqS3r4EnrRhXzXz8B0JlF5xVSf5zQhgRxqgA9XFaZNPyrsUiX1DlifBonsTiJtcsCRThCRiD4TIYqsemCDqZ7IJYtrNP1APcNgs9HE9nc4SScE7Dh/RNHYbwSGWVsDs8f+JHwSrQjR/q3vvYjpQhYRGWAEbyrJS6WJ5d4vstZ+htEaLAajhiqjnArRlyDeZ28N5YrwSGrUTr7QccMqnw1VBlCPQVRwtGWMHwZ3jORBA992QkKHTWJDP9V1/M9cbRDK4N0cfMt2q5YEQci9R0KZ62sSMAnquqPHYpjWY5lmJNHNzGFDqs9e3E8uwSmXHjHdpKS7yCVI7/KmAZaIhnKNot9G1HLebK4QADBWnVXHPxNMj06/YPJ
		N3/GMNR6RPzolN1om6sfX8zqIQN7AbSwVRB/I9iA7QJa7Opa+zim0RWl57C243PaJNOKCwHOvxUhSIl38z/DottEmdKtPJBi60sE4eASfzOvUW8GpMifcqEGS0gwqpum1ps8nWwqCDx7iU5Venvd0Yes8VM6slBmR6VE+JiCP1AChHaqKEEjD/zcgnSnx7SRfSkx5w8eb8payImO9OL2v3HKB5lkGdlsBs3wsUD2fu2vhZm+qLXBAp1sJfxCM/M3QUXSf+FHP5MLL0+g5ZSsULq0D3BWU34tawGcUM24WT63Ct31fSh4sm09LcPIFLpmRK+E6yAxa8w63V9ykWghQt0fo3HG5VJ7gjGzxUw0JaJlbM6UKbcNib7EnFCUUFh1fQ3to/3gZMhoFtu0a1ygeGLjgtOnNFUzql0yN/C7/7IVHquNSb1Uc+L3iMROt0dL47tOxi52XPDftfD2b2JHIke9PXusz6WII6WuCuEvO4IZZXAZQ299qIfZRyCsCQgSbxiTefV1dBZNsbD6v1QhAvQ2+/hfbYWGBXF+Vdu6juNK9zHb8X/7S193bODtvoLirOM0ll/EEMXJ2Z9iHBWV6b3PY2xOQM11Mvjl23XpZ5ENZHZbNmsh5Cd68ZEwts8AMPc16er0ovyiu9MUU2mvdLftHm6Z3W+CKGFmKuyo0gonahYsI2Yu2GAv4umImxuJbLF7ksKsHiqqktWLBRx3ZuEa0vphpF21zmprPsio+MlSML2bWsnJ/4WESEtxweIGzjsFC7VY1w1FLD3WzjADLkAcypr7igt9
		HjevsL4xnp3haBs1xwaFZZACX//1H00kq+9q+g5vtTT2v4EPax6O7oaZpD5/aAXP3UwuyY8JqlWfacclZu6+5Y+swUiWw1QyMBAG1t7HjcHi6hlJwu02X8Nx0sbRjh05LCqwqgXm6lz/mVMvqHOkmKXfkv9T7jnJO8+fL9HfcLBepaNm/op9OrKmIFLgjctlJCT+buBPB47IaSqXVZ+frCO8DWfGUdtN7FGavqBdp82J9SeBJgQCyX0OdZpFPk3+QRWtpN+YGU46arOGZBPirvfgnv+EvVfxMt6y0myaJRtmNg4Yq7Jx2EZMYbcq2KcJp+o00/lReJNjmMqSh7iy5cARj6ESDVhmp0UPKU99xXoTNnF+/ZCDE1Z4twONnJlZT1LB/qnzC/lgQMEmulfC/UdKU0yKr7PSqiMaBoYwXOfeJBhzW88qofVIRxmutsAjo34Mi60A8mmt19bq9rP2/uYU2Cqy5ATmbSpvETy7egupd1tpwjdSEeHSnK4k+BTeI7dMns8qKo6UcIsICHON33JR13bz415sCj2IzBsXaDwtB2yOSWCJm6M5Zw+CPEFxHHf+sbaMnRLEgl/0t12uXMUsVgcLzQOIHkbXhxhjRRTFsJN6efTbD1+r9ntQwSajAkGc5h5qHks2xyfwj4U8PYbVpfMtmYkvG5iQppX9A/7f1vpIbHiOAyuCWRfhsS5umbewfrKiy6xKfgcHB+YwhAQKT19NTM2GOmp2ts5PjKfaLgt6sSXNLqWk6uviQ1O9ridaFaC6JIueaIVU21JXQIx+WkdPz1va
		bEoWlgAiBXUWcpi7xkG/2eFJeQTq2wjHAwYiThQXFy9hNAYbXbRA2q6wYe8siSvwRbKrh2F03RBcdjqvNqwf5paydLzJh/Erhut0Y2/3qlyP7wLCWCJ8+7Yz0gXiQWL+xswwFFlb7Wogy/hifXrnd53ooOYebbfe3qjD5lWYETRaMLUQQZHjpPzPnO99XrZbmouXOyT5rZAK1ug42xDHjStslyX5s6u6o6K6X9f/vo6KiJ1Xz+r4Mj9wR8H5DUSV4ojfm90H0FKKnJ2BF95brhqxKn0fI/8sw2VZVlEo4iG+O12ikWWyY5CK8i2Dbl5Z9Cdp/nFB4tjlNhyrLEpWgmlve0l84/IzLeTrg5cUvOz12/uVuaHqHPmBGu9pfsNRCz0BSa2TeYof8hEO5TPN7tPFahrpF/l/ySh7hFNQRMFX9ibyRny0sFpKlnDWVyw4wff8pQim/nK1fOu/hPTo9MMA3zA9JRfGYOtcefZAUi1dTIH9944XFd3TWFO4H2WKdgEv1+LxfNV/QHqPWLcqFVXlEFf87CqQWzSIZGJonEnVqeZRmydUwpy3YGXoYN4TAArQ5Wk1Fy5hm9q1UGXs8lr/nJrh+2slgjE+6w8Y/AwN06TPVWSOdZ9KnGux5suL/zE9M6PgPi3sLS5N2X4kWRhyObtCnRz1uO/IXt1qUpOOs8xVh12J3zuRcRP7ozadEzIqui69b0ipB7XLNEfai26VF0LCPznUzQaJuIg3BRSfb0NEGcN5iqFzT7n3nPIWKoNV1dAQRu9sXLEJ2lpSBKv3Ts5jaqMO
		1Q81Bbd8U+L9gNhciuCIMY8ayPxI8OcPRY29zc4H0fXQgUyeXXQl5cawFFbdVw42ywQ87gHe4N+KciNPLFYTE8haEhPKIyPah/WpqakWGpdEHZhmL/zAo/wqV0XV7vJ98tS1KmPUstGkj4z/TsIKQw5C/5Vbq8FWSJj4JzcuCobASFcyGpdvWvSzFhNFsiP5oom41li97psCiXNIefEQfKbA95M/6Atx3RWXrMe92yw88/7qj1+2C6qkxWPUNzXds4M84vZ/oZf85Ak/PbX/CdexWe1v5rKcr5KUzk2Yrmmg7h78ZrqYzuZXa/S3lx5dCsIqux0DFRIOJuu8OrJbgdNX6K68joZv5r+Tor8mIvweDScCMRkUlpyhJWQbVYnDgZ8T0JFERxG4C+wXfldOxu59B2THLxTUvWgXu9DjZbe3C/WNtHMHMZYFHAp/ZV1FUqhZcKWh/DTCNgTq2mCgE+d8w3l1WBbcoUOfSyz/+LWMP/k+ZWFhIT5JXqJBqvxQCK0z6f5Wfl3c1bZqyCeh2fSEApTL9rH6LVWsY6e21t0UfynKpgYbZ82u+2NISEiH0eSKFMxMqdYmMuUL7HeNnv+lvbMOiqPb33wPHkhwCIRgAyG4De4yBPcgIWiAIVhw1xAIE9wmuAYN7sFJ4A02uCW4uwV3lry36t6qW2/V1m7t772/3eVTdf6Zmh7p7+nT53nO092rZ96GV00sZof3xH0qQmSYmmDkI4hRFFWxBNV5W+r7Olc64oKR1WOTgLf5UGM64eKUqJaWVjDgPV11RX9MF31Umhi6
		h5t+VRHAyqJS1xDvcYx8MucIBXXZpn8YMcBs4/EFMqojLIvdtHV0WownOuz2czmAvWV85g/7vmRN1/XcgSizxDDswqo1BmKoq4rbopwGVcyyE6xJAkrwot9bsBH2Dn3fdEPFM82NMVoue+rUIMzuHfT23E/Yf4BLGF2KnH8kcj7z4V1Dg8u3LyIGNQPyJ/RPUytpvmxmkRAiobQv5GgnRyoZrImjm64Uo0fHFaJKoY9v99py/Q7m7aGocrr+sBM8OjJyaAX27LYTFelNcfe7DLKYOGo3kFzp5fnJSBGPu0zse+4UXU/hfb2fGTfxKe58Ymm7mANleff3LTj4wOdFu11w8GxPy46LW2dIutlE+h7iPmTESv3wHQd0w+7gYq96jIMppwbd41Ti0WAkUqlcdwsTethHc+X2xUdVJE7AFTVnL7+XQacNu7X1x1WmzKTdQ6fdXy/nAxNVBSIOnF1cjowI1DOE41vJRT7AZWVlqYE9s6jr2p/LJ9ecnm0FnL369Of95K/eXJpl18xrVVzOAMu2fQyxXU01tjfKA8F4t3P3VkGd/YCAgNrW4NG9V6RqS+dGq7ONl0Lq+3SwvoS8LS08iI7G0i+/7pfibuTLF2Iur4ufxnQt+Y67iFd4n+1XxZhZ0FPVNDU1tbtMUwIoq6+9BinPe/NiHyCo3KUZzLhNtA1ByNSbXkPPU4zCwx1/meJnt5u75oxgbm5s1GvypyeGoUNrq6u1GHPSpB4pZLSi3kS9nqqbpfyCCjnbMYfrMwOQhR6Za03qezq2SDoPmQDsSi73AYeU
		1LRVn/zbQ4QOVEEeDk/Xv5cGlAmmOmD8ENzrOo3WbUhyh0RnPhAH6jT8vStcLw3yJwxpwG9F3ybUcSQqieXFnVMnep5KkDpm3O7F5cjISHEMmm2c9Firy0RVhkd9x077YjQHDBNFt18v2zlxROX165S3Ygm3xY0h/sHobRcRu90BnOTd6VwVMUSLc1/fuaqrD7agunvVm3JBatd+TRsp8+GlDCyWgtW+Y0ubS4MSMnGCqk+mj2Mqrc1/pXKydnJRKhRI620+zImztDvNBVvLqyck6unpiXUhjZRkLzhgj2eid+kj+N8ceJaqz2lZ9iTIoxtXjXeuRbtNKGrHhdo/4w7xTKsdPmhM5eXlxTOkGoxlqkgjeUoa2kTaGmmsm9aHBlPhW5tPFZdL2/CSjyx6XmQH9ad0wSA2ts/sFLavFZ014FCoIYyKVvqBfOz22OIpwZX1bX8qhXCtOC/Rsw0NfpKN1/t45ATm3jc/+eCkES5+c9NY0iy9Y/wVEOaFViGzPxmhGxuzIhdyPF8IlI0yc5RGDz5A615jgVpTOhnUqjMdqbe8T6VZYuX4vYjUWbPdTziYF73ixYW+KCp0PfTGLeMGnSoTV/TNUSWFS9Vn44UnD8XL1on9yfUIheiitkmIyQsQg/ZsMqHWW1nL7Z0fa6MW63dwi48kOxyay2C95xwpugCAwv47C5CUoh+2LMKlp6k5LAQ+FyMgN6/qJkYWgQ4flAu7f5yOlnRNkdym/+ThgU5AaBjHpo7FpAhl1ANewKIT4guaFJnjNGQRGuG3Haq4pGTHmH1F
		pL/I7Ptks09Dtf38t0hVPeJK33kIJTIFDgVXwu6/WlEfd8EDfvCJiFy6aPKXKHEXFhBE/l5pVDij8ceMAss9oUBmoQjcjiV5cUKvXozp6JToC1qT95eETCX09va6AM1S0O/qHIk049itSD2mo0aNjUD8BYpY34+V3VqZwOrvpSkZ6ysmoNl2UbIzE4VepF84O84Kdc/uttTCTpx5BDoIlJS86mqX8LHz3cSzYmiiKMxAqYbEP1H1djQMS4y0Lm7RefkyuWLNuaSOmWROJDw83FyjGxNoTIdz75QlPkGXY84x1FZIBcqMsH6tdSNYLEQzl531R7HtuW6HIAbAzmKlFj9a3d2ZmTsHQIq0I2VF+4VxMrSsr0JvT8XTP+ube+lLydAF8CChuqw1BK3TUOeHEDssT0NVaRChQgEpbGdcL31IrxZ/sOZ2KF0dduhPemDogG0v2BFByRKnMYNEJsPXhGCGiu9Hm+4Tt5qsvCk+al0qbVS0ns6M26hi3Vy+vLxsQyAQpWGEQsN7ITr+v3PlHL9ESlWsm+63coP1upE49n00vHgS5IA81EOjuwmZYgxThpoiRSShpnqbBDCxNmQea4/V9tra6/qr40mnmHPR+Es/vlhzo9xH7/+ffaby/038M//Fx+POx/Nfkf78X8r/cfPz/5n/hPDd5f/+Fv6t/v8F6c//nfpDINz8d/X/O/ir+v+fTX/+z/KfXJzct8X+Z/6T53f9+Xh5+O/yn38Hf5H/lPjd/sx/frZ0mAH+mf8E/fjdQOf6uY4AgC//j/xn00tLG/1xl+s+
		n54t+ifRC8zqU++zoF0VSnX7H3XvPaKXfChQFi3gUCsgMZxRbtrBfv+Tv2mrbUy9XOUo+uOON4+/uBB2SPpVcT3SrXjlgTDbxgnOlgsBP4mhC1myh80gvU7SrvHlow9mKHDlC6g5xX9fJ3a803CS4rRLN2VMT/iBOed5PH5WaKIb6DVNliNgDkjVl+ARqGO3okHyEjwCEvu5DgRp2zHZ2NhW7bJ9nekS0kS9XBvwF3CQ3tQE1aS0Lihv/XdGvyLvG9/KGSIpOB5bj2flp0+LPuCFzYJNFycJIyOjurh9u4QzEHhCb4HTCNPdWEHhzFUs3U+a6WjjI9tL9tLn40G61ah9KYJERFIi9+fUwXqVyPkeB8C/EPIuUTxO45ohvb+lTE+26AcIyerp6UmFsncCjBVH9VZQlkmIKTL5ceRcetxq5haiaP176SSCcyMFmuH1JTdhcDHDjQQeYemOpZFWS8FUKjXyVe7VXlYzeqrP+EKW2vf1rCjR22HFrI0y0GS6bDvmIA6IRU5cqTxTC1FkhyrH+Edz4YyGhgsO4DIK3h0yKK9d1+a4v+e30q+aGg1hw/1CgqYusWKDU+rUC8AYUwfGJTKj+x/xrmir+xbSDIV0ma6c7J9dniz8OrXuKc8zw0SqnO2innpy1Vc5sjdGUQgciu9rBKPVcnwdGwYF4YcdTFbvN3MkUQh/ytYhGeRaF+iLfKmnl8Z0hGDsAgXjUnK/Kv8RCj30p1am4j4rGj3oE/O6NKWJqyf7uOQvyMlZKdMudqqQ4eGF9a2fQHCyJn2YZ7srN5fB
		milNUWhuqSs214SshSFLfP95SKKfaeTWVa23H8s7ivgFHX9zQeO3A+X9yRQqPvqlE4ufYulyvGmTe8Wmfv5M5Pj+OR81IZHwQ3v/hzVFwyvSwg+lFhGP11aR6XElV+AiJKhSV/Wtjyoan929mHz2LVOY+eQxHof+l73T267yWJwqKHQIfHh4KLJocUlj0XdteZ7KUsjpO0q2OJXWUbyoaZoirPVDFvqNM6ylpLT0BsZF1YwrR09ohLGXrTOrftE9j2mBW4qQ6Kmobu6LmjsdHlvvBiHEdG83oR3moVa8fechxe4ZtrObGz/RoAMQ/a2ZyHGjk+7nItuXJGSR/q8ezd3PNuy1xY1JVXKM4KxMg8J5zGf7g8aTcoXwN25dMftlcfs4tra2TUE+JeStSLQ5dHcy8YyhD7LcHZvlCotaQl4T5KmNysoWO1J8frWxKVNdHpM5UxUS+ZdpiPxm5BlRkEFS7nSW5QQRcivkiT7u2vr6GTNBnbYODvNVNVId9O1ciwlbotcsJsO6MlIiSWGVveQjB/xzi3nqR4/8wW/stO1XPj4+fjtWRqcW9vb2DyB+HaEns7CIx73SZ7k1NsKLjkI+cYlOiszM89FD+0OWJRqCiJqIirbme1Fou6cd3iflP509qaDEpFIiA7OzRuVlPtGorD2eP1jarzguFppBiLo2ndIwROcRbhu5yk6nWzp1gG0kceU7hCNFQ+CVjXDbWeYvHEdvx2CIc9db85OzwQj5Tc3dng9NQdtScFGNbplK4xnQB2jW/VbpoHdDW9k3vOObFEMVbLFn
		XxXVUUqewcK0C+0C4xDiq9bhDFMmzPdmE6DL+6J99hpPVwobcNVdfHnIYTmwy++Nr/Cql16osBJKQqXg/SdHR4j+arYUkNFB9+rNk3EvNZCLb4AZ87BshsxVe34vnv79gsZFQSJoqz26eHb0vExPjSgNh2EJUMb4gzZXr8bxnngTsfuwYt3btqDt2wKUxNXbGcZ7SCLxSAnzfqg0L4fNbj1FAw55o7fvu5IrhOl5zb0i3ErbyRJpJAo800r/EBGq6/6SlpKF0csMjBrFsmPxLQMLM5ThZYe7Z3xOSrYif5Zq7yYK8AG6ACudmHaqc6IGMXLYGCGVA8OUeZkwGAx8NFy5O0lCY3M7UJIpXoaffif3WTwnryz3FIbrT7LT5MkXRHzTxmA42qjGneOFETAbVgaLM9qMuFyVpKWlpbZWk9vb0Ua/Wmk6di8PWBGpUiubtil6BDMeFH76LbP2A+Mcv8oaWEEKenUu/5qEM9yNtIbrtEK90vU5Wm9M1sDJcjvfHwpsC4rPUecgEgSYj6Njn9I7ODFJARKBbS97PyaRkzpjA508M1yPCn3cIjQyx7VmsA28bm7HvQL+58uMr9m1LBKCwTYihUOy2JO8ypPYgOftSF0dx20ot8fi5Y7mz1LEimGCwYcxyR/w4gX01eh3VIBA6VOmFT9LX0xGH2LPfZicYjrrD+xTDQs/P7/wkrh9/aUIwVhlFrbbsSLDj6NHodf7Iq2i+7B3Pp98TFkotXcCcwhCwrS8hRGd95yQWC+RT6JUwdZxU+73JfNjCA1hHPPcnyo/52oQ
		2IfvcB12cr4flxt8rWh4WLOL++zXMq+WQJw8tfvxfo4y9pS96PJEkRAsTvQRyfdLbQVoPX6WPPDjhcBcttKRJzGnDjooZXbSO7aGRbdmMjKX5XHdAWZ1OCmXdvpDVjSCo4IqFkf6LJgktIR7TJ53e0JYBx3m6yHd0enZpl9hpv1psxivuPA4EqwDd+rMFkkaXwdeBRUvdjPrqWtpX6coqaTqRBDTv6ALp+dRtiSJ5gWTNhdENQ9xzu5gx/sUPTffDWvfOe1aOh0M0xDGvhCIFV3IdtTMzvZ/9SCA3jKJ0Bqc3MnJd/ZL6XOK8Dl9iIeQcYiP4mt/28ilC1krrJH7gMgFKoDoLhtTc9HnwOGYEBUjN4g9tlgLf4kaPVhbEUqdlNTX+JRDdfvZ13tMbe+TunKPvm84DDUW/jGcwo8zmSDInPCTBJ5N6zPu52qWJGHSr4JCm+wkE3i7L8ENAfx67yR1fknpufbZxftnYMUdujj30YHQjbH3jRnnxdF14VlPeQw9bNNGKx4+197yfCB/SuYX/g2SiQKAGSNhtMAX0mDHteYAaGu+iTGyMDLxAEzqoBUWsarRbFlI3TfxcZNWjVENdMz2OCxqnj2y/yv9vifWC0oqXF1FWLSeaBBq8QNyQcQ5UINGpqNqxCOpJ1OViPKexcPD1DNrYX0j5pMVp7RvgnzDKxAb4Rf5kWLFfOdjwh7rCBqDh+BHE9hYRk2mNl9UPsAZt9f9FUzOVZ4ANNKFIywszPFVZqSaQ3VXbgU9mNecNTt9Gms3bjDHlgfXgXlb/uTjKLks
		zkbYWp4DRwpMObnoELyHrjYE5s3kEyES0FmydVuyzheKO7vSgoUnebGLJROtVgR5CYUjTwPlsMGOiOjakArcstWs8ldyxsMWmBFBvsn1l9omXx1x7XLzTnydtqQEvYgltFFhnaTYDdxyOSMZKtCn2EcfsEQfEU6ss/awjWsSoI+IcQ+9vIgbmLla1B09rbGnf0SSK2BrXkFtNlztkW7Zoocm74wZVNNJCnON02iqXxTA5OltqnSxMqfDTGXpcfN/bmm+jCFDT4w5V8eozOJxwaIZ718whCv7QtJRbJZOyZQIjU08F39QEcC2XUdoNLMICQk9A1KYHjunz6jtg/kxEeWEde1q3WLiNU/GId5oRRU9y/MoThPNnK5Khkk/UsTFk8x6dgzZQ1XXtKynbc6WVnqTY18d91MEoQkfhVBivC57TsuMEIThRYwB+SBAoK/Ee/aPxR6tGjXFVal9VqZqIgDrdRmHQcly0cVpD94jzVkYgdPyU4WCE3/rJ+U6TRh+3/OpGGXgKV1pSCMyO5mvibSTxyWjSBRtq5CcRnMTCpD58Vo7BoJlm/UXn+n22bfX8Ykdjzs8iBJcJESoxDuR7O/xknonv1KNzqCrRSRVBH/f6FzkJKl3JaMXYRFkThVl6yhpZClFNhZzC/YnSiVpg8Ij6ifeYq9qcKOsZMmTgnR2Bjf0VdMTT2pra6lRYZQSUCVoPwnhM7mXB/KfurXU9NttGGJpWo8iQAIWPKNeGKzd3ek9eBHVAl0Fk6MjSANH51fJ3bppKgObn/m4TTvNH2sWdy95hqy7
		hmo7iNAfytT3znBcbk/dnJ3qKpyhQFRJuD3oB1yTjb8E5HjIdEtt4+AJAv6tqDBFA4m1bwdKkirZ7+H2xfoqUJHYxL2sJ8pFvBss5GEywRxKazlR6y9rHmZkYoaFGwRtI71bK4qMDD4ly8jKyobAffUFaOT09gaNX7aU0mQiyHtd1PGPbkWGkEnVG3iM5chF+FtHTKmiS4go91H4M+knXPPEQFnG4rO284pXFtgnFA9WlYf0S3Pi9qv7+vrOlpSInX3jEw0sNtP5rHZsiMqvfL8FWo4kFB9Vw5ymo342O1CQTxC+zO+YL9MDm/Md6lWWwwq1a10Hfqg1JfLMe6maoAYdz2bq1Hfva3T71Ni2VMmdBPnBLL7WNib4ilddacd2nXDGOLMpgEyl1elWXvP2HlUFaU/88cwkKRxqr+W2kiGd4sGD70bimSi4KdCnKiwkRPrEj7309wPE+5EleZQ0BJ5cE+ZY+sEhxez6jog9cSoOErQwMZKNARR6ffPmn4qjN+o/djQC4XH4Cyx7crHWjD8OP+1FEHOFlz5TLwaPff1Sk89lL8MRylf8/ilZVwfKdtvmnAoCoYEZhK/q4WMzv3kEBTtwQG6GCs1cVXKIjHq9iTUltkOOzM1pd8Ncn31GI39FGb1XAvkIoDyjxmvnsCUkKBX101c407kVRTfbvGNu84lNLldFOkaV8HYj3N1u9EzE45j6OAaCbP8XHEo+bVZh/BJ56bhvEg+5xG7/ovgFOR6rgyYPVaT4VySH59EofC53nM5vYEzeHDNkZP3N44Q6deixGMVU
		c3kMSol+emLOokB/dVWVu1i7IGvd3tZkrWrp7UT5ib/X5evjnqXdllTRybVLcYOPpBlfL8LfXwsfdjf4yNl0ODSPT01d0hOQsG3FVe3v/N6ssNArGn6NjPxuYi6avjl7Ug9xhKxwf8sp18dU2hoae+zb+sM9WbJZMmpZoO9Ap0Tfo6iwsMcwZN5RLCEDCv5lC/itVnP20fY77o8f7zWULnGMvIgq+VSMErcEPBhxS24uWXXynI6gsWzu01IIZ8zxHbn9AaqKomeCrF67yvSEJyju9yQGvzFBnAKGg/2iKZIEihgKh206QOPkLZGoP7hoVfhC5faH9ZSLlENdBwnTkXJM4hW2F9QTk5NGRhGiLNhiMA7NGzSJLl6R4NElS8TGrqtGgaTZPh13KLFwlqA+wX2ppZ6ggrG2uORqXY9KOF+QHEsBZzeSiWm5UKN79/uiw2xPrK9ur4XTyPDwQTyQJhntFahozJvey5Qz4jtZ40ca2WFkuP4wpxBXPDg4uA0CgeChnmIQsJ2AjyooM0oWfGDXQeYvONiRW9oBm8frNuBoLOCU0D9Y/Xz5cwxlK1I+Z+SlQsFsLxLZWGHaEWFOXec1/95bZHpycrIg7vyxv1fCWS644Vl5ZB4l4IP0DkvEY86ZsbK1FXVucmmixdWFX19fh+izu4XiZ+HoWB8cfamHPUdVe2+SYgELhcdodGfjv3rOxJsRt8F3f1FXU1NzMGnJ6pfffJf6VliOgNJvO+JuOeBv5p/+H4TbHcL938D/5+P+0//nhdz5v38H/1b//7z//2f9IRAu
		vrv6/x38Vf3/Xv+fk4eTB/Iv/5+P/x/+P++d//938Bf+P83v9qf/7+TpeQj80/8Htn43kAejQxMAYI7+9v91g1J1Xtjo65BfXzvF10FMhV0blUVcU341P1GeZpSv/fKKAFuKhJBmroBDRgoBHlEgkPHxB7+Fq41iMgdif3aXpKHlq5apQvmQQB8ey4MTsRlm2tHX3rBYbtrvujrj5Esl4ubd8Wsg/2a46eYsfvemT/BGMHgP7nh1fmTPSeZN1XoPLIRC8x1JO8wzDiriPmAlmI7SMMQObqO+nWVyXDE6rA/fX/jlTuE/DniHwqWuuWDaH80/GEzBEBot8RrX9Z8+LR5boHCKitoKRhwQAXkA2TVX8ugCJcIwISb557nxEyu5PNSsrLqYw4+UwG5DyYU2J9mlB8+jXhFu/66uLhWmZSN4/uwwW6XPyfbU4Rq6RwtL/2ciKNp7IbISNm4a/0RDdZfVQj3Nl8/xqPZAZ6012/H1DQ273sz+7iK+ZK3i8HwCYCwu1ZtN2NUnYPgpsPbkuzBg8zTQhuCrUx4KpQ8ie/yhRJgiU8vPmRkxPVIJk2ZxcBYGILBapO8xHVHL+cWBP7cbtIdudBnhYHxeZnhADzDmiKkrpNrY2am688msQsEEaHsl8ZfSFuuXeNu/3lZ0gTqV3igtb/1yXLwPnelTxcNtYGkDaALXiKQaIVxcBO5YEuzxXqnwc2CusdLzSOnNAtbbIsevWn2JDrvsR11BZniTb7JSKOEofp2zwnzM1Ckc/qeNJmQc8UBCSsqW2YoOYKwpqCje7TMk
		F8gWp5GT2qBoMR2O9FO8FdwY8HvQdlbF40aFSf6UP5ZewBC/JC6Z/fLocqaWUeA6MBjslQyg0a3zQQ7VX8fJtDYB/yhAsJJF5zkD/1JfiXPP0cjyK5OkmmkiHvVL7YIteEPMlgy7ePbHcXYPT4xHfvNK4SS+m4lnDQDNm5nGF6C5SaAMvC1cu7Ti4MeblZsVQ85HgLLzzeohMTHwWhLC8JnlfXXIwIuhMBheqZdfU7oEw7uDfCydc9NpzXWL3cLGWpKW5rIyfNL3Jt5B8ABg7yOE1yB7hqWEWeQ1dPM7MENMuykENZnGt3yWvROYX/gIDCo2foPFsseFau1pO8rGZiP6lpD2KnJnS8nk0cTQ+mG8M9izj6J5q4TX+OHgcSBmtagJQMbMnKiTdN+6ypC/PWTzMUgNBHia7eInkEN5G/54pJNM9XKAZ9uBsnURiDKpSwremO61zOOxWglqqaW0wcG5cgLKmJYvT0iJiJIVcEl/ME0uGGgbkH8JpV0jAAsxJtSRAAvMCP/SYa5KNmqzkjrrAoK+lRBMbFDhbi3lBg6O6MI6M2/xenjnNVZrQVZLanpUwRaWRcV4QvTJO924ujOpiHzcDGwghjmeRTJJtzmfu44WiALCdM0UdN8ew6ngOljbBamI0dd6miTrD/l1qXQEvfTZ6b0koNhA0dYLuopaAR95x8Oa4n5mkD9IIkrtCQGvbfIz2MNvwgQfegYVq6rJ5LFCLSdV1rLaO+aK9ZFbGwAfKNCqs4iRy6rER8+88PsLJibn4iQlU3GAtb5uRvnJrg52cZ9d
		uvN0jssTr3tA4jMlu5Lkp7LF0nSxStvkLbb4LwE4IwughCqRhyUL+tjsyUPA41VdxivxdkEME9WrRcBl+/h9XE/am14XmJGhAquGyVMbrWJ+9YEtuuE1IHCX2NytBUsGByAU8icAOtqyx8nxax/b95dcKiDeS2DRvzboeho501zR3M8ZLPxuVE7hBOttjQQ3hAUBVi6cYgu7x/Ymegzvtg8nS2E5fKXw1itNneY92XiHU3cqKipe6fwmmeY5h8CZxVi2iOSP5s+CToUPpxp6pMTkIrdIC42es536ykIZiT0jE8dBczKQsTZ/zRhvNpcuAz3xZ4H+3RNXhiwYwLLAPUT/xRvBbvPx7eCMMoU3YplDx1p+rBj7s5zJwjjQP4LwbwgHX/NIQ1tQ/eFlSXghom2+TxHdMImBhGjepE0iQxbYZKILw2rSsneF8s8zqXT8+hndplb/BwF9BVvvxbWTsVJLGT6RAHEafhF/vBJUP/V4l1gJ7C0a79J+bVwTJGer7rfykrLoHXtvWczs/UU3fJNBMsiJlmNctAlLr+lZNoyQZExcRtql3Aj/YKpAwsIv81xm3MXvHnHEYlpamiVYCBXQMhu5GXmUYGGfyXVP2e4zNeG8MbWCuZc5DnMdbyzJGv/G5xYJNKdQz75G4tfplTSPsNFbfo6O8r5EA4BbMWmyEgmag5e77V283Sk0zlZ7BhUYYGNua8PSuyE1KWxJoUzYfoj8IddSs8oIyDHdxCkxzLIGHE1GREby36NlJ1THAaaiNnVULWTpsF9PiJ7etMRh0zgwD5Tf
		fkikrcn8oLfYjXnpOSEGkFFb62aI5RCTaAGa4yr23LObz0ORrW7a5Wpjf7ksLUNHIb3WBhnLzIjXZ3L56TJdehYr3u7/FJ1h5kmWpGotePunW0ri4E3n6BhrjwrKfXFUpBqI0DRyfbSw3zpatxiryrNZoeBEOnMgNDw8PFTYCSFa+5SBAQXp/agVz7X5noG9o0LOCswM9mkMe1DMBB0M/kEYoO2YabKCRnAVBvdt8Lu53nrjIXbkIMTHN2ZF9t0S4Ggd38S51y2qIovQ8NNSuPp+g3WmBIgkJifj5AyvxwJpbWNsG4A/xjDPaoIHbiu9/73fCWLbi/3WVomflEvxN6BenNDy8pIS6t9Tgzst/v8B/7r/G587F99/A/3Py/OP/B/nnf77O/i3+v/n9f+f9YdAuO/8n7+Fv6r/36z/uXh5uf6l/3/3k1v9f/vSnf7/G/gL/Y//u/2p/6kPbkyAf+l/198NpOLFgAUAqBS/9b9AuIGm4mt9c+LrPj9qJ4uS6tgJMwbLBNnc4Vzleg3pzKQfH7/Ys72ODsmgMHBW16tX4w8Bw7EDKBzo4K8fbqg8h3/4UIPRPvZ9TF7JLsWMIZxcKLHuQG5n8fHD9cCRSqGUDrfTPjfceb+asjJOejAHQPYwui1aLhu3lSA6PeGsUp/9pGPHc0MgYlG3ebcFfW6KkN/O6Fihx6/Sesn0QkBZ3XdILpvIjBI/Gi9Owy5Xo+AYt3VqKsUyaYW/BK2jv7bUyOnbChENGN7J5SUO8sf65st23oNOJ06sPhG4Wd//AA/PCxtQGvYe
		N79ph4QXWuPWqgTAAZqisVL7Jg8SAJ6B+HJ1mlNcJ5z8OO12GvUAUAuSmsfy12Gvspval8O4Wj7qyqj4BQECj7Q7e5XxgAA9UwbdUhWPuU+7XjjjH9ZSFgVkiQmavtAXI2TeiGED3dxHZRqbGMCnWuHSo3Y8VP/nFPfIcnGBnimqwk7tF0wuz0ACV6Paluho6IDeyUwH+N26NGDVf3I47Wm12yxOm0+eaGYYOfl0Z1B99txaBlish99ndTxwA/Z6EPKWXu+5orxPlXT2a3WIfmoC+DFK3jqTZPe0dw3pNPGOdk517yU/8q/ClcCaHJYfJnZmo5HQhbrQ4+qSocmEJPBU04lCQlWgy2Ehg0ZbUqrO4W8sWuP5x6hpNWIxw3T3TNso3+bDZy4GXufVUWszgmXQjRcsK8VxCED+xk1C2yTXTAF7rQ8pCjta7EZk0SueMpYUB45+P2xKnnOg48qwnIh7tRI5TLxNqXZcCtC8lMx/slgIzLFdCVPEsVTSgElqexYuUAAmNtcnBUX0ED8FQI2RWMyKVuTCxrpm5KO9ffDFxHSBqRfhwIm4wNiHRDX+2Zr356zq6WaVP0Mne+iE7GLFLsyd6V3UKi1ojIEBr/pnwr3gOd8K2Ez5+/NX2TfA3NFFmqWvrxjKnCiBh0fiJIsRZs5Cb6vMzE4McdZXS7ro9Rw5DagY0oy7lEDdnrqVPeMTeJ+QIJU4Wvqj+Wiihzo0V2bpQJ/dzdTtym+82zU+xepR/O8D7G4Wfccdd9xxxx133HHHHXfccccdd9xxx3+Q/wGYD0n7
		AGgBAA==`;
    return Buffer.from(base64, 'base64');
  }

  get svgIcon() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
		<!-- Created with Inkscape (http://www.inkscape.org/) -->
		
		<svg
		   width="135.08963mm"
		   height="135.21298mm"
		   viewBox="0 0 135.08963 135.21298"
		   version="1.1"
		   id="svg5"
		   inkscape:version="1.1.1 (3bf5ae0d25, 2021-09-20)"
		   sodipodi:docname="dibujo1.svg"
		   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
		   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
		   xmlns="http://www.w3.org/2000/svg"
		   xmlns:svg="http://www.w3.org/2000/svg">
		  <sodipodi:namedview
			 id="namedview7"
			 pagecolor="#ffffff"
			 bordercolor="#666666"
			 borderopacity="1.0"
			 inkscape:pageshadow="2"
			 inkscape:pageopacity="0"
			 inkscape:pagecheckerboard="0"
			 inkscape:document-units="mm"
			 showgrid="false"
			 inkscape:zoom="1.5219183"
			 inkscape:cx="366.97107"
			 inkscape:cy="230.95852"
			 inkscape:window-width="1920"
			 inkscape:window-height="984"
			 inkscape:window-x="0"
			 inkscape:window-y="24"
			 inkscape:window-maximized="1"
			 inkscape:current-layer="layer1"
			 objecttolerance="10000"
			 guidetolerance="10000"
			 fit-margin-top="0"
			 fit-margin-left="0"
			 fit-margin-right="0"
			 fit-margin-bottom="0" />
		  <defs
			 id="defs2" />
		  <g
			 inkscape:label="Capa 1"
			 inkscape:groupmode="layer"
			 id="layer1"
			 transform="translate(-10.895871,-22.224895)">
			<path
			   style="fill:#f6f5d4;stroke-width:0.264583"
			   d="m 76.399094,103.81675 c -4.08651,-0.62626 -7.5722,-2.85581 -9.91237,-6.340242 -2.342689,-3.488172 -2.871165,-8.6302 -1.31199,-12.765532 0.76278,-2.023099 1.55675,-3.225551 3.28509,-4.975209 2.6524,-2.685105 6.01676,-4.056922 9.949545,-4.056922 4.05776,0 7.3397,1.386195 10.13353,4.280096 2.80249,2.902873 4.00664,5.928222 3.96327,9.957461 -0.0315,2.924495 -0.70615,5.232378 -2.17129,7.427417 -1.28578,1.926322 -1.68323,2.372892 -3.19426,3.589041 -2.86293,2.30422 -7.1004,3.4419 -10.741525,2.88389 z"
			   id="path4508" />
			<path
			   id="path4506"
			   style="fill:#e1e1e1;stroke-width:0.999999"
			   transform="scale(0.26458333)"
			   d="m 296.35156,85.279297 v 20.531253 20.53125 h 8.28906 c 2.37435,0 4.77294,0.0679 7.1875,0.18554 0.0353,-0.006 0.0737,-0.01 0.11524,-0.01 0.014,0 0.007,-1e-5 0.0215,0 0.029,-1e-5 0.0568,-1e-5 0.0859,0 0.0434,3e-5 0.0876,-0.002 0.13086,-0.002 0.0392,1e-5 0.078,-6.8e-4 0.11719,0.002 0.0468,-0.003 0.0939,-0.002 0.14062,0.002 -0.0117,0.002 -0.0153,0.003 -0.0195,0.004 0.0387,-0.002 0.22263,-0.0159 0.26563,0.0312 0.0101,-5e-5 0.0219,5e-5 0.0273,0 0.059,-2.9e-4 0.11906,-5.8e-4 0.17773,0.002 0.0735,-0.005 0.14825,-0.0101 0.22071,0.0137 0.0219,0.0233 0.15787,-0.0122 0.20508,0.0215 -0.0758,0.0117 0.11693,-0.001 0.13281,0.006 0.0449,-0.005 0.19135,-0.0185 0.22461,0.0137 0.002,0.002 10e-4,0.003 -0.004,0.004 0.0518,-9.4e-4 0.10473,-0.002 0.15625,0.004 0.008,6.5e-4 0.0291,-0.004 0.0234,0.002 -0.005,0.005 -0.0172,0.01 -0.0273,0.0117 0.0454,-0.005 0.0912,-0.0157 0.13671,-0.0195 0.0676,-0.006 0.13716,0.0271 0.20508,0.0234 0.0874,-7.6e-4 0.17434,0.002 0.26172,0.004 0.01,0 0.0312,-0.0102 0.0312,0 10e-4,0.0202 10e-4,0.0438 -0.004,0.0684 0.0182,0.001 0.0365,0.003 0.0547,0.004 0.0116,-0.0303 0.0282,-0.0532 0.0508,-0.0645 8e-4,-0.007 -2.1e-4,-0.0146 0.002,-0.0215 0.0164,0.003 0.0326,0.008 0.0488,0.01 0.0663,0.008 0.13273,0.0147 0.19921,0.0215 0.0949,0.009 0.19018,0.0187 0.28516,0.0274 0.11806,0.0107 0.20785,0.0455 0.27148,0.0918 2.27919,0.16287 4.57463,0.37784 6.88086,0.64063 0.003,-10e-4 0.006,1e-4 0.01,-0.002 0.0141,-0.003 0.032,-0.001 0.0547,0.008 7.1e-4,8e-5 -10e-5,0.0117 0.002,0.0117 0.51259,0.0586 1.03116,0.14355 1.54492,0.20703 0.0136,0 0.0273,-1e-5 0.041,0 0.0285,-1e-5 0.0576,-4.6e-4 0.0859,0 0.0422,6.1e-4 0.07,-0.009 0.11914,-0.0117 0.008,0.003 0.0155,0.009 0.0234,0.0117 -0.0172,-8.2e-4 -0.0345,0.007 -0.0508,0.0117 -0.004,0.001 -0.015,0.006 -0.0254,0.0117 0.0286,0.004 0.0574,0.008 0.0859,0.0117 0.0126,-0.006 0.0194,-0.007 0.0332,-0.0137 -0.013,-0.005 -0.026,-0.0105 -0.0391,-0.0156 0.0159,0.001 0.0312,0.01 0.0469,0.0117 0.002,1.5e-4 0.004,1e-4 0.006,0 -0.005,0.003 -0.009,0.009 -0.0137,0.0117 0.0288,0.0115 0.058,0.0226 0.0879,0.0312 0.008,9.8e-4 0.0157,5e-5 0.0234,0.002 -0.0131,-0.0103 -0.0621,-0.0336 -0.0918,-0.041 0.01,-0.005 0.0186,-0.008 0.0293,-0.0137 0.048,0.0128 0.0914,0.0335 0.13477,0.0547 h 0.0527 0.27148 c 0.14964,0 0.25772,0.0419 0.32618,0.10156 0.0223,0.002 0.0442,0.008 0.0644,0.0117 10e-4,1.6e-4 0.003,-1.7e-4 0.004,0 1.46626,0.19177 2.95227,0.48638 4.43164,0.74609 0.016,-0.0114 0.0343,-0.0171 0.0527,-0.0176 0.0258,-6.8e-4 0.0534,0.0124 0.082,0.0391 0.13764,0.0243 0.27442,0.0458 0.41211,0.0703 0.0737,-0.007 0.13966,-0.0133 0.16602,-0.006 0.0338,0.0114 0.0654,0.0319 0.0977,0.0488 h 0.002 c 0.0202,0.004 0.0403,0.008 0.0605,0.0117 -0.0294,-0.0146 -0.0634,-0.0308 -0.0801,-0.043 -0.006,-0.004 0.0127,-1.7e-4 0.0195,-0.002 0.0821,-0.011 0.16392,-0.004 0.24609,-0.004 0.0993,-0.009 0.19391,0.003 0.28711,0.0391 0.0254,0.0142 0.0869,0.0532 0.0977,0.0625 -0.0393,-0.0136 -0.0732,-0.0418 -0.11329,-0.0527 -0.0665,-0.0181 -0.11891,0.0119 -0.17382,0.041 0.076,0.009 0.15241,0.0132 0.22851,0.0215 0.0146,-7.4e-4 0.0294,-4.5e-4 0.0488,0 0.0208,4.9e-4 0.0412,0.008 0.0605,0.0156 -0.0363,-0.006 -0.0727,-0.0117 -0.10938,-0.0156 -0.0284,10e-4 -0.0487,0.005 -0.0664,0.0117 0.92945,0.16805 1.85189,0.30154 2.78125,0.46875 0.0628,-0.002 0.11771,0.009 0.1621,0.0273 h 0.002 c 0.33181,0.06 0.66684,0.14235 1,0.21289 0.11326,0.009 0.22488,0.0291 0.33594,0.0547 0.10136,0.0265 0.20311,0.0619 0.30664,0.0781 0.0754,0.009 0.13987,0.0184 0.21289,0.043 0.008,0.003 0.0246,0.009 0.0215,0.0117 h 0.002 c 0.004,9e-4 0.008,0.003 0.0117,0.004 0.0227,-0.003 0.046,-0.006 0.0684,-0.006 0.0293,-4.3e-4 0.10731,0.0283 0.16016,0.0547 0.045,0.0101 0.0897,0.0191 0.13476,0.0293 0.0221,-8.9e-4 0.0426,-0.007 0.0762,-0.008 0.0552,0.0133 0.098,0.0256 0.14453,0.0469 0.0108,-5.9e-4 0.0224,-0.002 0.0332,-0.002 0.007,2.3e-4 0.0376,0.014 0.0664,0.0273 0.0163,0.004 0.0326,0.008 0.0488,0.0117 0.005,-5e-4 0.01,-2.6e-4 0.0156,-0.002 0.0343,-0.004 0.071,0.004 0.10547,0.0137 0.0613,-0.0259 0.1065,-0.0395 0.0488,0.006 0.0352,0.004 0.23163,0.0429 0.27343,0.0781 v 0.002 c 0.0521,0.0114 0.10415,0.0219 0.15625,0.0332 0.001,2.7e-4 0.003,-2.7e-4 0.004,0 0.051,-0.001 0.10483,8.3e-4 0.10938,0.0215 0.006,0.002 0.0116,0.004 0.0176,0.006 0.17713,0.0381 0.35439,0.0775 0.53125,0.11328 0.1001,9.9e-4 0.18144,0.0209 0.24414,0.0527 30.59951,6.23195 62.21383,20.30796 88.9336,40.52539 1.18988,0.90031 2.53306,1.98722 3.98242,3.21094 0.0841,-0.0198 0.13319,-0.0483 0.11914,-0.0937 0.14634,0.15156 0.29541,0.29789 0.45508,0.43555 0.10998,0.13348 0.23634,0.30836 0.31836,0.43554 0.004,0.003 0.006,0.009 0.01,0.0117 0.10596,0.0908 0.22312,0.19692 0.33008,0.28907 0.0216,0.0124 0.0838,0.0533 0.28711,0.20117 0.12643,0.12656 0.2522,0.25431 0.37891,0.38086 0.37999,0.33062 0.76157,0.6624 1.15234,1.00781 0.003,0.002 0.005,0.009 0.006,0.0117 l 0.002,0.002 c 0.1511,0.13357 0.33195,0.32151 0.48438,0.45703 l 0.002,0.002 c 0.0346,0.0273 0.0683,0.0552 0.0996,0.0859 h 0.004 c 0.0239,0.0235 0.0439,0.0467 0.0625,0.0703 l 0.002,0.002 c 1.82514,1.62591 3.8468,3.64584 5.79492,5.48047 0.0229,-0.008 0.0478,-0.0128 0.0742,-0.0137 0.0919,-0.003 0.20367,0.0379 0.31641,0.14453 0.21857,0.20661 0.47584,0.37316 0.64062,0.48828 0.0491,0.0837 0.1225,0.14098 0.19922,0.21484 0.0113,0.011 0.0238,0.0238 0.0352,0.0332 0.0117,0.01 0.0298,0.0101 0.0449,0.0195 0.0752,0.0508 0.12526,0.0968 0.17969,0.16797 0.0144,0.0283 0.0115,0.0131 0.0742,0.0703 0.0431,0.0428 0.0858,0.0863 0.1289,0.1289 0.0419,0.0418 0.0831,0.083 0.125,0.125 0.0401,0.04 0.0791,0.0811 0.11914,0.1211 0.0457,0.0459 0.0929,0.0908 0.13867,0.13672 0.0378,0.038 0.0751,0.0753 0.11329,0.11328 0.0291,0.0321 0.0616,0.065 0.0918,0.082 0.11528,0.0724 0.21877,0.15711 0.3125,0.25586 0.0612,0.0737 0.0473,0.0525 0.1543,0.1582 0.0522,0.0556 0.10636,0.10567 0.16797,0.15039 0.0722,0.0565 0.1303,0.12852 0.19531,0.19336 0.005,0.005 0.0207,0.0234 0.0352,0.043 0.0261,0.0114 0.0515,0.023 0.0762,0.0371 0.028,0.016 0.0476,0.0445 0.0703,0.0664 0.0427,0.0424 0.074,0.0844 0.0937,0.13281 0.0104,0.009 0.0221,0.0228 0.0391,0.0391 0.11755,0.103 0.21921,0.22211 0.31446,0.3457 0.0722,0.0773 0.16149,0.13775 0.23633,0.21485 0.071,0.08 0.14864,0.15318 0.2246,0.22851 0.0745,0.0741 0.14858,0.15041 0.22266,0.22461 0.0854,0.0852 0.17044,0.16865 0.25586,0.25391 0.0949,0.0839 0.19249,0.16361 0.2832,0.25976 0.0484,0.0588 0.0253,0.0292 0.15039,0.1543 0.09,0.0902 0.17972,0.17961 0.26953,0.26953 0.12208,0.12223 0.24511,0.24496 0.36719,0.36719 0.0987,0.0923 0.17737,0.202 0.25977,0.30859 0.0745,0.0893 0.15324,0.17652 0.23828,0.25586 0.0995,0.0927 0.15085,0.18706 0.16602,0.27149 4.42412,4.38713 8.69876,8.83226 12.18945,12.75195 0.12213,0.0819 0.21895,0.20195 0.35742,0.41797 0.18503,0.2092 0.32797,0.38442 0.50781,0.58984 0.004,0.004 0.007,0.008 0.0117,0.0117 0.0144,0.0163 0.0358,0.0434 0.0566,0.0703 0.006,0.008 0.0109,0.0127 0.0176,0.0215 0.0688,0.0787 0.12734,0.14847 0.19531,0.22656 l 0.004,0.004 c 0.0646,0.0644 0.13024,0.12753 0.19336,0.19336 0.0854,0.0919 0.12168,0.12795 0.23242,0.2207 0.15345,0.16387 0.0749,0.0703 0.24609,0.3125 0.0255,0.0253 0.0327,0.0298 0.0352,0.0293 0.002,0.003 0.0172,0.0311 0.0762,0.13086 0.009,0.008 0.008,0.012 0.0195,0.0234 0.004,0.008 0.0134,0.0217 0.0195,0.0312 -0.003,-0.002 -0.007,-0.004 -0.01,-0.006 0.009,0.0109 0.0181,0.0224 0.0273,0.0332 -0.005,-0.008 -0.009,-0.0166 -0.0137,-0.0234 0.005,0.003 0.009,0.005 0.0137,0.008 0.003,0.005 0.0264,0.0251 0.0195,0.0215 -0.007,-0.004 -0.0129,-0.008 -0.0195,-0.0117 0.0153,0.0171 0.0203,0.0264 0.0352,0.0586 7.8e-4,0.002 -3e-4,0.002 0.002,0.004 0.002,9.9e-4 0.002,0.003 0.004,0.004 0.11755,0.0942 0.20536,0.17037 0.25976,0.23438 l 0.01,-0.004 c 0.0174,-0.0182 0.0358,0.0375 0.0547,0.0566 0.24087,0.26202 0.73194,0.80798 0.91601,1.01172 h -0.006 c 0.17382,0.1926 0.29054,0.38174 0.35938,0.56055 0.30513,0.37402 0.77048,0.86926 1.04687,1.2207 1.13868,1.44782 2.16671,2.98273 3.26758,4.46094 0.11916,0.10533 0.23664,0.24019 0.3457,0.41016 0.0204,0.0317 0.055,0.0577 0.0625,0.0937 -0.0494,-0.0362 -0.0639,-0.0468 -0.0801,-0.0586 0.0538,0.0418 0.13799,0.1105 0.16797,0.14258 0.0684,0.0734 0.12633,0.15601 0.17773,0.24219 0.0253,0.0421 0.0836,0.1337 0.10351,0.18164 0.0652,0.089 0.12349,0.18083 0.16797,0.27734 0.0449,0.0612 0.09,0.12231 0.13477,0.1836 l 0.006,0.002 c 0.026,0.0185 0.0558,0.0353 0.0586,0.0644 6.1e-4,0.005 -0.006,0.005 -0.0117,0.004 0.011,0.015 0.0222,0.0299 0.0332,0.0449 0.13328,0.0841 0.28976,0.147 0.37304,0.29102 0.0116,0.0156 0.2815,0.35376 0.5293,0.75195 0.033,0.0375 0.0646,0.0759 0.0977,0.11328 0.19828,0.22286 0.39968,0.44277 0.59961,0.66406 0.31117,0.34423 0.43845,0.67976 0.4375,0.95899 17.82634,25.25962 30.23829,54.47701 35.90625,84.60742 0.0333,0.1014 0.0654,0.20364 0.0937,0.30664 0.0342,0.12453 0.0365,0.22897 0.0117,0.30859 0.24723,1.33653 0.42438,2.68091 0.6543,4.01953 3.1e-4,0.001 0.002,0.003 0.002,0.004 0.005,0.0229 0.0112,0.0458 0.0195,0.0684 0.0334,0.12366 0.0607,0.24202 0.0508,0.36523 2.2e-4,10e-4 -2.1e-4,0.003 0,0.004 l 0.002,0.002 c 0.0404,0.13452 0.0421,0.10557 0.041,0.16797 -2.5e-4,0.0271 2.8e-4,0.0547 0,0.082 0.0155,0.0918 0.0277,0.18363 0.043,0.2754 0.004,0.0214 0.008,0.043 0.0117,0.0645 7.1e-4,0.002 0.0107,0.01 0.0117,0.0117 0.0788,0.25021 0.1034,0.3606 0.17383,0.63086 h 0.01 c 0.0392,0.15012 0.0246,0.26989 -0.0195,0.35156 0.24973,1.54392 0.55181,3.08241 0.75391,4.63086 0.0164,0.12578 0.0251,0.2883 0.0371,0.43359 0.004,0.0182 0.006,0.036 0.01,0.0859 0.006,0.0145 0.003,0.0278 0,0.041 v 0.002 c 0.0297,0.39388 0.0571,0.80016 0.0976,1.14844 0.001,0.004 4.6e-4,0.008 0.002,0.0117 0.0862,0.26121 0.0325,0.0589 0.0586,0.26954 0,0.007 0.0102,0.0104 0.0117,0.0176 0.0196,0.10022 0.0145,0.0801 0.0176,0.16602 -0.01,0.081 -0.01,0.16288 -0.008,0.24414 6.6e-4,0.0267 0.002,0.0534 0.002,0.0801 0.005,0.0172 0.0101,0.0387 0.0176,0.0703 0.0135,0.0484 0.009,0.0984 0,0.14648 0.006,-0.023 0.004,0.0587 0.004,0.0742 -1.4e-4,0.0434 -1.8e-4,0.0874 0,0.13086 v 0.0254 c 1.52999,14.2225 1.53938,35.18967 0.0781,49.1543 0.0285,0.0681 0.0435,0.15514 0.0351,0.26172 -0.008,0.0904 -0.0139,0.17912 -0.0215,0.26953 -0.003,0.0419 -0.008,0.085 -0.0117,0.12695 h -0.002 v 0.008 l 0.002,0.002 c 7.7e-4,0.005 -3e-4,0.0154 0,0.0117 -0.002,0.0404 -0.0351,0.1245 -0.0586,0.17773 -0.004,0.055 6.6e-4,0.0255 -0.0195,0.0996 2.5e-4,0.005 0.002,0.0104 0.002,0.0156 0,0.067 -0.0128,0.11772 -0.0293,0.18554 -0.0942,0.82835 -0.13448,1.89847 -0.24023,2.66602 -0.18605,1.35095 -0.47097,2.67026 -0.68164,4.01367 -10e-4,0.0274 -0.003,0.0542 -0.008,0.084 -0.008,0.0425 -0.0166,0.0872 -0.0273,0.1289 v 0.002 c -0.0584,0.36988 -0.12726,0.73617 -0.1875,1.10547 0.0944,-0.13446 0.0348,0.0155 -0.0234,0.14063 -0.004,0.0255 -0.009,0.0507 -0.0137,0.0762 -4.2e-4,0.0194 -7.7e-4,0.0392 -0.002,0.0566 0.006,0.0277 -0.004,0.0712 -0.0176,0.11328 v 0.002 c 0.012,0.0603 -0.005,0.13074 -0.0215,0.18945 -0.006,0.0414 -0.0152,0.0816 -0.0215,0.12305 -7.8e-4,0.005 -7.7e-4,0.0105 -0.002,0.0156 -5e-4,0.002 -7.7e-4,0.004 -0.002,0.006 -0.0107,0.0422 -0.0213,0.0845 -0.0371,0.125 -9.9e-4,0.003 -0.004,0.007 -0.006,0.01 -0.19568,1.17025 -0.47524,2.31235 -0.68945,3.47656 v 0.002 c 0.004,0.0969 0.001,0.17924 -0.0176,0.27539 0,0.0141 -0.004,0.0297 -0.0117,0.041 -0.004,0.004 -0.0151,-0.0123 -0.0156,-0.008 -0.004,0.0229 0.005,0.0457 0.008,0.0684 -0.007,0.15441 -0.0365,0.31467 -0.0879,0.46094 -0.004,-0.008 -0.004,-0.0329 -0.008,-0.0254 -0.008,0.0159 0.0405,0.25134 -0.0332,0.29102 -0.0136,-0.0159 -0.0647,0.2672 -0.0723,0.25586 -0.008,-0.008 -0.0145,-0.0212 -0.0156,-0.0137 -0.0113,0.0707 0.008,0.14619 -0.0352,0.21875 -0.003,0.0189 -0.0299,0.17617 -0.0488,0.1875 -0.002,0.002 -0.002,2.6e-4 -0.002,-0.004 2.6e-4,0.0142 -8.2e-4,0.0326 -0.004,0.0234 -0.002,-0.004 -0.006,-0.0136 -0.008,-0.0215 -5e-4,0.003 -0.005,0.005 -0.006,0.008 0.008,0.0519 0.0117,0.0577 0.0117,0.0469 6.2e-4,0.007 0.004,0.0206 0.008,0.0605 -0.004,0.0975 10e-4,0.0781 -0.0215,0.19531 -0.004,0.0113 -0.0136,0.0179 -0.0156,0.0293 -0.002,0.0113 0.0113,0.0375 0,0.0351 -0.0162,-0.004 -0.0328,-0.008 -0.0488,-0.0117 -0.004,0.0216 -0.009,0.0429 -0.0137,0.0645 0.0743,0.0264 0.092,0.0488 0.0762,0.0898 -0.001,0.006 -0.003,0.0102 -0.004,0.0156 0.002,-0.004 0.006,-0.008 0.008,-0.0117 -1.9e-4,0.003 -0.005,0.0106 -0.006,0.0156 -0.005,0.008 -0.0112,0.0161 -0.0176,0.0254 0.002,3.2e-4 0.006,-3.2e-4 0.008,0 -0.004,0.006 -0.0123,0.0223 -0.0117,0.006 -0.001,0.002 -0.004,0.004 -0.006,0.006 -0.005,0.0269 -0.0145,0.0989 -0.041,0.27734 -0.0151,0.0987 -0.022,0.19785 -0.0332,0.29688 h -0.01 c -0.0205,0.1752 -0.0915,0.28764 -0.17578,0.3418 -6.79081,33.99927 -21.49876,65.26783 -42.47656,91.65429 -0.002,0.005 -0.004,0.0102 -0.006,0.0156 -0.0472,0.0903 -0.10151,0.18663 -0.16992,0.2539 0.009,-0.0268 -0.0724,0.10377 -0.0762,0.11133 -0.008,0.008 -0.0139,0.0199 -0.0215,0.0312 -0.0608,0.085 -0.13112,0.17083 -0.18555,0.25586 -0.0487,0.11036 -0.1046,0.21442 -0.18359,0.30664 -0.0724,0.0935 -0.0187,0.0277 -0.0742,0.0957 -0.0132,0.0147 -0.0239,0.0337 -0.0391,0.0488 -0.004,0.004 -0.012,0.0167 -0.0117,0.01 -10e-4,0.005 -0.003,0.0101 -0.004,0.0156 -0.0884,0.18354 -0.22759,0.33981 -0.36328,0.49024 -0.0752,0.0729 -0.15865,0.14001 -0.21875,0.22656 -0.0714,0.0869 -0.1511,0.1644 -0.23047,0.24414 -0.0359,0.0348 -0.0772,0.0675 -0.10742,0.10156 -0.0499,0.0741 -0.10163,0.14783 -0.15039,0.22266 -0.0688,0.0843 -0.14473,0.16201 -0.2207,0.24023 -0.059,0.031 -0.12369,0.0532 -0.17774,0.0918 -0.028,0.0217 0.0643,-0.0177 0.0957,-0.0332 -8e-4,10e-4 -8.8e-4,0.003 -0.002,0.004 -0.0181,0.0246 -0.0279,0.0497 -0.043,0.0762 -0.0627,0.10809 -0.12609,0.217 -0.22852,0.29296 -0.0471,0.0889 -0.12632,0.15778 -0.19141,0.23243 -0.10242,0.11376 -0.15879,0.25114 -0.25781,0.36718 L 459.94922,476 c -0.0386,0.0385 -0.0767,0.0771 -0.11524,0.11523 -0.0521,0.0521 -0.10295,0.10329 -0.15625,0.1543 -0.0563,0.0533 -0.13629,0.15009 -0.20507,0.21094 -0.13153,0.12057 -0.27082,0.23182 -0.39063,0.36523 l -0.0195,0.0195 c -0.31871,0.37813 -0.66499,0.73341 -0.98633,1.10938 -0.0394,0.0519 -0.0775,0.10455 -0.11719,0.15625 -0.14116,0.18637 -0.29223,0.3659 -0.42187,0.56055 -0.0843,0.13519 -0.16106,0.27938 -0.28125,0.38671 -0.13773,0.13731 -0.27491,0.27453 -0.41211,0.41211 -0.0813,0.0813 -0.16439,0.16138 -0.24414,0.24415 -0.0971,0.10166 -0.19105,0.20848 -0.30859,0.2871 l -0.16797,0.16797 -0.12696,0.12696 c -0.005,0.006 -0.0108,0.0101 -0.0156,0.0156 -0.26873,0.30526 -0.54006,0.60834 -0.81055,0.91211 -0.0231,0.0413 -0.0496,0.0814 -0.084,0.11524 -0.0613,0.0773 -0.0928,0.17402 -0.16016,0.24609 -0.004,0.007 -0.0125,0.0207 -0.0332,0.0527 -0.0473,0.0729 -0.0991,0.14013 -0.1543,0.20703 -0.0423,0.0575 -0.0352,0.0502 -0.0937,0.11329 -0.002,0.002 -0.005,0.004 -0.008,0.006 0.009,-0.0203 0.0345,-0.075 0.0234,-0.0566 -0.0151,0.0234 -0.0258,0.0497 -0.0371,0.0762 -0.0166,0.0238 -0.0357,0.0496 -0.0508,0.0723 -0.10848,0.12812 -0.22287,0.24996 -0.34571,0.36524 -0.0748,0.0745 -0.14083,0.16023 -0.22851,0.2207 -0.027,0.0177 -0.15282,0.15679 -0.15235,0.125 -0.0386,0.0753 -0.0907,0.15108 -0.14062,0.1875 -0.0707,0.0964 -0.12382,0.20541 -0.2168,0.28516 -0.0741,0.0673 -0.11896,0.1514 -0.18359,0.22851 -0.0722,0.0722 -0.14385,0.14733 -0.2168,0.21875 -0.0752,0.0718 -0.0827,0.0638 -0.10156,0.10156 -0.0272,0.0435 -0.0557,0.0949 -0.0937,0.12891 -0.004,0.003 -0.013,-6e-5 -0.0156,0.004 -0.0306,0.0523 -0.0424,0.0773 -0.0449,0.0859 0.002,-5.4e-4 0.007,-0.004 0.0117,-0.01 -0.0185,0.0254 -0.029,0.0422 -0.0781,0.11133 -0.0744,0.0673 -0.13943,0.13598 -0.19726,0.21875 -0.0416,0.0367 -0.0716,0.0762 -0.10938,0.125 -0.0605,0.0548 -0.0941,0.13837 -0.16406,0.1875 -0.0412,0.0333 -0.0308,0.0171 -0.0742,0.084 -0.0571,0.0915 -0.13075,0.16849 -0.20898,0.24219 -0.0654,0.0654 -0.13031,0.12993 -0.19531,0.19531 -0.0537,0.0544 -0.10964,0.10844 -0.16407,0.16211 -0.0771,0.0775 -0.14738,0.16131 -0.23242,0.23047 -0.0646,0.0484 -0.1703,0.14674 -0.18164,0.1543 -0.0843,0.0782 -0.13106,0.18928 -0.21875,0.26562 -0.0642,0.0786 -0.1177,0.13516 -0.17969,0.2168 -0.054,0.0499 -0.0856,0.12192 -0.14453,0.16992 L 450.57422,486.5 c -0.0484,0.0491 -0.0966,0.0969 -0.14649,0.14453 -0.0638,0.0621 -0.11723,0.13535 -0.19335,0.18359 l -0.0117,0.006 c -0.003,0.002 -0.005,0.004 -0.008,0.006 -0.065,0.0578 -0.12513,0.12079 -0.1875,0.18164 -0.0151,0.0144 -0.0298,0.0298 -0.0449,0.0449 0.0401,-0.0798 0.02,-0.0356 -0.0723,0.0801 -0.0113,0.0151 -0.0298,0.0219 -0.0449,0.0332 -0.16191,0.14249 -0.22281,0.20693 -0.39062,0.36719 l -0.004,0.002 c -0.0956,0.091 -0.19014,0.13609 -0.27343,0.14844 -2.40754,2.49079 -4.88851,4.91551 -7.41797,7.29296 -0.068,0.0726 -0.13655,0.14472 -0.20508,0.2168 -0.0794,0.0775 -0.16338,0.14927 -0.23633,0.23242 0.004,-0.0113 0.0154,-0.0408 0.008,-0.0332 -0.0119,0.01 -0.0118,0.0277 -0.0156,0.0391 -0.008,0.017 -0.0198,0.0358 -0.0274,0.0547 -0.0242,0.0469 -0.05,0.0788 -0.084,0.12109 l -0.0215,0.0234 c -0.11528,0.11565 -0.2305,0.22999 -0.34766,0.34375 -0.0896,0.0903 -0.17133,0.19054 -0.27149,0.26953 -0.12849,0.10621 -0.26092,0.20951 -0.37695,0.33008 -0.0378,0.0193 -0.0754,0.0393 -0.11328,0.0586 0.002,-10e-4 0.008,0.004 0.004,0.004 -0.005,0.002 -0.0126,0.007 -0.0195,0.01 -0.0443,0.0326 -0.0853,0.072 -0.125,0.10937 -0.0763,0.0771 -0.15457,0.15293 -0.23243,0.22852 -0.10582,0.1096 -0.20012,0.23357 -0.33203,0.31445 -0.0287,0.0197 -0.0595,0.034 -0.0859,0.0566 -0.0136,0.0113 -0.0298,0.0316 -0.0449,0.043 -0.0148,0.01 -0.0337,0.0204 -0.0527,0.0312 0.004,-0.004 0.008,-0.007 0.004,-0.006 -0.009,0.005 -0.019,0.0114 -0.0273,0.0195 0.007,-0.004 0.0138,-0.007 0.0215,-0.0117 -0.004,0.003 -0.008,0.006 -0.01,0.008 -0.01,0.005 -0.01,0.005 -0.0156,0.008 -0.0287,0.0301 -0.0524,0.075 -0.0723,0.0976 -0.0868,0.033 -0.1801,0.0525 -0.26172,0.0957 -0.009,0.008 -0.0185,0.0154 -0.0273,0.0234 0.0223,0.004 0.0958,-0.007 0.125,-0.0156 0.0463,-0.0146 0.0823,-0.0484 0.0957,-0.0625 -0.007,0.0101 -0.0231,0.0309 -0.0469,0.0684 -0.1081,0.15194 -0.11798,0.14777 -0.28126,0.26758 -0.008,0.004 0.01,-0.005 0.0176,-0.008 0.0329,-0.017 0.0558,-0.0493 0.0898,-0.0645 -0.005,0.006 -0.0247,0.0267 -0.0332,0.0352 -0.0578,0.0643 -0.11398,0.12797 -0.16992,0.19336 -0.24151,0.29359 -0.55872,0.46349 -0.87695,0.66797 -0.0762,0.0487 -0.14661,0.0758 -0.21094,0.0879 -0.75338,0.67131 -1.4788,1.37 -2.24219,2.03125 -0.0247,0.0605 -0.0659,0.12369 -0.1289,0.1875 -0.008,0.0113 -0.0159,0.0198 -0.0234,0.0273 -0.14751,0.15674 -0.30112,0.30825 -0.43945,0.47266 -0.18373,0.2217 -0.37871,0.43135 -0.64063,0.5625 -0.082,0.0321 -0.0226,-9.7e-4 -0.10156,0.0859 -0.0843,0.0934 -0.18279,0.16415 -0.27539,0.24805 -0.15965,0.12586 -0.33874,0.22161 -0.49219,0.35352 -0.0933,0.0911 -0.1792,0.18713 -0.28125,0.26953 -0.0567,0.0461 -0.12186,0.0804 -0.17969,0.125 -0.0355,0.0272 -0.0695,0.0595 -0.10351,0.0859 -0.12246,0.0956 -0.23736,0.18184 -0.37305,0.25781 -0.0518,0.0291 -0.11216,0.0421 -0.16016,0.0762 -0.0219,0.0166 -0.0416,0.0436 -0.0605,0.0625 -0.12435,0.1251 -0.25148,0.26432 -0.41211,0.3418 -0.0552,0.0215 -0.0178,0.003 -0.082,0.0625 -0.11324,0.10582 -0.23264,0.21794 -0.37891,0.27539 -0.0558,0.0215 -0.10687,0.0368 -0.1582,0.0586 -10e-4,5.7e-4 -0.003,9.5e-4 -0.004,0.002 -13.40409,11.01594 -28.22153,20.54049 -44.37109,28.15821 -25.22748,11.89973 -57.90619,19.78905 -81.97071,19.78906 h -8.27734 v 20.5 l 0.0117,20.51758 11.25,-0.61719 c 16.96198,-0.93033 36.67553,-3.89496 51.89258,-7.80273 61.70689,-15.8465 116.78108,-55.75206 150.65234,-109.16211 28.50765,-44.95238 42.49468,-98.69008 39.19531,-150.5918 -1.06408,-16.73836 -1.39627,-19.44034 -4.1582,-33.86133 C 530.19343,213.05255 479.70534,147.03748 407.85547,111.77734 376.00843,96.14856 344.18842,87.972087 307.10547,85.890625 Z M 439.17188,497.46094 c 0.001,-10e-4 0.003,-0.003 0.004,-0.004 -0.004,0.002 -0.0102,0.006 -0.0137,0.008 0.002,-0.001 0.006,-0.002 0.01,-0.004 z m 0.90039,-0.80078 c 0.005,-0.004 0.01,-0.01 0.0156,-0.0137 -0.0208,0.0106 -0.0423,0.0192 -0.0625,0.0312 0.009,-0.003 0.0294,-0.01 0.0469,-0.0176 z M 331,128.77734 c 0.0123,0.002 0.0249,0.003 0.0371,0.006 0.01,0.002 0.0151,0.0128 0.0215,0.0215 -0.0196,-0.009 -0.0386,-0.019 -0.0586,-0.0273 z m 143.03711,28.42578 c 0.008,0.0106 0.0198,0.0352 0.0273,0.0527 -0.008,-0.0174 -0.016,-0.0326 -0.0273,-0.0527 z m -43.61914,16.25 c 0.0122,0.006 0.0364,0.0159 0.0781,0.0352 0.0281,0.0139 0.0609,0.0325 0.0937,0.0508 -0.0794,-0.0408 -0.14688,-0.0735 -0.17187,-0.0859 z m 12.89062,11.78126 c -0.003,2.2e-4 -0.004,0.002 0,0.004 0.0266,0.0144 0.0542,0.0253 0.082,0.0371 -0.009,-0.01 -0.0188,-0.0186 -0.0293,-0.0273 -0.0102,-0.009 -0.0431,-0.0148 -0.0527,-0.0137 z m 24.92969,28.0039 c -0.004,5.4e-4 -0.008,0.003 -0.0117,0.004 0.0537,0.0738 0.10848,0.14682 0.16211,0.2207 -0.008,-0.0333 -0.0146,-0.0648 -0.0234,-0.0996 -0.0247,-0.0968 -0.0693,-0.133 -0.12695,-0.125 z M 332.34961,299.3418 c -0.0516,0.0516 0.25111,0.45697 0.87305,1.25 0.75484,0.9625 1.5425,1.75 1.75,1.75 0.82303,0 0.29265,-0.82059 -1.37305,-2.12696 -0.79304,-0.62192 -1.19838,-0.92466 -1.25,-0.87304 z m 175.75391,65.16211 c -0.004,0.0411 -0.008,0.0684 -0.01,0.0898 0.003,-0.008 0.006,-0.0113 0.01,-0.0215 -3e-5,-0.0161 2.2e-4,-0.0563 0,-0.0684 z m -1.26954,8.84375 c -0.002,0.006 -0.004,0.0107 -0.006,0.0156 0.002,-0.002 0.004,-0.004 0.006,-0.008 0,-0.002 -1.3e-4,-0.005 0,-0.008 z m -196.1875,220.60156 c 0.0249,-1.1e-4 0.0435,0.003 0.0527,0.004 -0.008,0 -0.0276,-0.002 -0.0527,-0.004 z" />
			<path
			   id="path4504"
			   style="fill:#dadada;stroke-width:0.999999"
			   transform="scale(0.26458333)"
			   d="m 297.26953,84 c -12.549,0.01739 -25.27158,0.605744 -33.41992,1.759766 -48.24051,6.832063 -90.26607,24.704704 -127.5,54.224614 -12.98843,10.29702 -33.53848,31.47644 -43.734376,45.07031 -27.519958,36.69155 -43.454851,75.87746 -49.86914,122.63476 -2.106437,15.35506 -2.081818,48.5029 0.04687,64.15235 7.800775,57.34102 32.641016,107.72394 72.996086,148.05078 20.53827,20.52385 40.98454,35.26293 66.49024,47.93164 33.10178,16.44166 63.48456,24.37439 103.07031,26.91016 27.10566,1.73576 66.68365,-4.04093 94.69336,-13.82227 91.7246,-32.03135 155.87387,-110.58033 169.92579,-208.07031 2.3698,-16.44635 2.38768,-49.46938 0.0273,-66.5 -8.12027,-58.68378 -34.34508,-110.59567 -76.27539,-151 C 434.11418,117.17339 386.94807,94.363411 329.65625,85.667969 322.19539,84.535528 309.81854,83.982622 297.26953,84 Z m -0.91992,1.279297 10.75,0.601562 c 37.08299,2.081462 68.90299,10.25777 100.75,25.886721 27.64913,13.56873 49.98652,29.86107 71.19141,51.92578 34.31202,35.70327 56.86917,79.23925 66.14062,127.64844 2.76193,14.421 3.09415,17.12338 4.1582,33.86132 3.29949,51.90172 -10.68769,105.63942 -39.19531,150.5918 -39.05374,61.58207 -106.03914,104.72383 -177.79492,114.50781 -7.425,1.01243 -18.5625,2.1176 -24.75,2.45704 l -11.25,0.61718 v -20.36328 -20.36523 l -11.7832,-0.63282 C 207.9276,547.89532 138.73275,501.80121 104.92969,432.35352 67.547592,355.55238 79.541511,264.7132 135.62695,199.8418 c 31.1678,-36.0502 74.29275,-60.91827 121.22266,-69.90039 10.09047,-1.93127 25.60353,-3.59961 33.46094,-3.59961 h 6.03906 v -20.53125 z m 17,41.183593 c -0.25061,0 -0.46278,0.0458 -0.69141,0.0742 0.0115,0.005 0.0211,0.0106 0.0273,0.0176 0.0101,-5e-5 0.0219,5e-5 0.0273,0 0.059,-2.9e-4 0.11906,-5.8e-4 0.17773,0.002 0.0735,-0.005 0.14825,-0.0101 0.22071,0.0137 0.0219,0.0233 0.15787,-0.0122 0.20508,0.0215 -0.0758,0.0117 0.11693,-0.001 0.13281,0.006 0.0449,-0.005 0.19135,-0.0185 0.22461,0.0137 0.002,0.002 10e-4,0.003 -0.004,0.004 0.0518,-9.4e-4 0.10473,-0.002 0.15625,0.004 0.008,6.5e-4 0.0291,-0.004 0.0234,0.002 -0.005,0.005 -0.0172,0.01 -0.0273,0.0117 0.0454,-0.005 0.0912,-0.0157 0.13671,-0.0195 0.0676,-0.006 0.13716,0.0271 0.20508,0.0234 0.0874,-7.6e-4 0.17434,0.002 0.26172,0.004 0.01,0 0.0312,-0.0102 0.0312,0 0.005,0.0679 -0.018,0.16468 -0.0391,0.25782 0.0206,10e-4 0.042,0.002 0.0625,0.008 0.005,-0.11867 0.0186,-0.22808 0.0781,-0.25781 8e-4,-0.007 -2.1e-4,-0.0146 0.002,-0.0215 0.0164,0.003 0.0326,0.01 0.0488,0.0117 0.0663,0.008 0.13273,0.0147 0.19921,0.0215 0.0949,0.009 0.19018,0.0186 0.28516,0.0273 0.0515,0.005 0.0976,0.0147 0.13867,0.0273 -0.0552,-0.0199 -0.0534,-0.0378 -0.13281,-0.0586 -0.48125,-0.12574 -1.11563,-0.18945 -1.75,-0.18945 z m 1.99023,0.29688 c 0.0482,0.0294 0.084,0.0647 0.10743,0.10351 0.0104,-0.0324 -0.0381,-0.067 -0.10743,-0.10351 z m 8.00977,0.71093 c -0.18197,0 -0.34026,0.0456 -0.50195,0.084 0.01,0.01 0.0154,0.0141 0.0234,0.0215 0.0358,-1e-4 0.0715,-6.4e-4 0.10743,0 0.0414,-0.001 0.0926,-0.001 0.10546,0.004 -0.0486,1.1e-4 -0.18633,0.0544 -0.13867,0.0449 0.0925,-0.0181 0.13854,-0.053 0.20313,-0.0527 0.0215,1e-4 0.046,0.004 0.0742,0.0137 0.006,0.002 0.0121,-0.001 0.0156,0.006 0.002,0.003 -0.01,0.003 -0.008,0.004 0.0323,0.009 0.0704,-0.007 0.10351,0 h 0.002 c 0.0166,8.5e-4 0.0785,0.006 0.13867,0.01 -0.0359,0.002 -0.086,0.0143 -0.125,0.0273 h 0.0742 0.0684 0.0703 c 0.025,-0.005 0.0508,-0.01 0.0801,-0.0156 0.0102,0.006 0.018,0.0108 0.0254,0.0156 h 0.008 0.0703 c 0.0214,0 0.0433,1e-5 0.0645,0 0.0294,-10e-6 0.0584,-5e-5 0.0879,0 0.0285,-2e-5 0.0576,-4.7e-4 0.0859,0 0.0422,6.1e-4 0.07,0.001 0.11914,-0.002 0.008,0.003 0.0155,0.009 0.0234,0.0117 -0.0172,-8.2e-4 -0.0345,-0.001 -0.0508,0.006 -0.005,0.002 -0.0224,0.0117 -0.0371,0.0195 0.0168,-3.2e-4 0.0338,-0.001 0.0625,0.006 0.005,0.001 0.0148,0.003 0.0234,0.006 0.0139,-0.006 0.0261,-0.0108 0.0449,-0.0195 -0.013,-0.005 -0.026,-0.0105 -0.0391,-0.0156 0.0159,0.001 0.0312,0.01 0.0469,0.0117 0.002,1.5e-4 0.004,1e-4 0.006,0 -0.005,0.003 -0.009,0.009 -0.0137,0.0117 0.0312,0.0125 0.0633,0.0242 0.0957,0.0332 0.001,3.3e-4 0.003,-3.2e-4 0.004,0 0.0123,-2.1e-4 -0.0422,-0.0312 -0.0801,-0.041 0.01,-0.005 0.0186,-0.008 0.0293,-0.0137 0.0426,0.0113 0.0779,0.0371 0.11719,0.0547 h 0.0703 0.20508 c -0.006,-0.003 -0.005,-0.005 -0.0117,-0.008 -0.34375,-0.13871 -0.79687,-0.20899 -1.25,-0.20898 z m 0.15234,0.13672 c 0.0526,0.004 0.10023,0.006 0.11133,0.008 -0.005,2.1e-4 -0.0297,9e-4 -0.0859,-0.004 4.7e-4,2.3e-4 0.007,0.005 0.0137,0.008 -0.0133,-0.003 -0.0257,-0.009 -0.0391,-0.0117 z m 7.84766,0.86328 c -0.39998,0 -0.77877,0.0754 -1.10352,0.1836 0.0573,0.0254 0.11063,0.0639 0.17188,0.0742 0.0461,0.008 -0.0833,-0.0447 -0.12109,-0.0723 -0.006,-0.004 0.0127,-1.5e-4 0.0195,-0.002 0.0821,-0.011 0.16392,-0.004 0.24609,-0.004 0.0993,-0.009 0.19391,0.005 0.28711,0.041 0.0254,0.0142 0.0869,0.0513 0.0977,0.0605 -0.0393,-0.0136 -0.0732,-0.0418 -0.11329,-0.0527 -0.0665,-0.0181 -0.11891,0.0119 -0.17382,0.041 0.076,0.009 0.15241,0.0132 0.22851,0.0215 0.0146,-7.5e-4 0.0294,-4.6e-4 0.0488,0 0.0208,4.9e-4 0.0412,0.008 0.0605,0.0156 -0.0363,-0.006 -0.0727,-0.0117 -0.10938,-0.0156 -0.0804,0.004 -0.10027,0.0279 -0.16015,0.0762 0.0973,-1.5e-4 0.19568,-0.009 0.29296,-0.008 0.0418,-0.007 0.0825,-0.003 0.12305,0.008 0.0527,0.0137 0.10348,0.0382 0.15235,0.0664 0.0104,0.003 0.0215,0.005 0.0312,0.008 0.007,0.002 0.0197,0.007 0.0293,0.0117 h 0.002 c 0.0224,0.004 -0.002,-2.8e-4 0.0566,0.0234 h 0.002 c 0.002,-0.011 0.0222,0.004 0.0332,0.006 -0.004,-0.003 -0.007,-0.006 -0.008,-0.008 0.005,-0.001 0.0446,0.0154 0.0723,0.0254 0.10967,0.008 0.21564,0.042 0.32227,0.0664 0.01,-6.1e-4 0.0261,-0.002 0.0312,-0.002 0.068,0.0148 0.0595,0.0127 0.084,0.0176 0.0513,-0.0184 0.17125,0.004 0.20118,0.01 0.0278,0.005 0.0455,0.0129 0.0586,0.0195 0.006,-9.4e-4 0.007,-0.003 0.0137,-0.004 0.002,-8e-5 0.002,2.6e-4 0.004,0 0.54641,-0.0837 0.82875,-0.21299 0.36914,-0.39843 -0.34375,-0.13871 -0.79687,-0.20899 -1.25,-0.20899 z M 331,128.77734 c 0.0123,0.002 0.0249,0.003 0.0371,0.006 0.01,0.002 0.0151,0.0128 0.0215,0.0215 -0.0196,-0.009 -0.0386,-0.019 -0.0586,-0.0273 z m 0.30469,0.13282 c 0.002,0.001 0.005,0.002 0.008,0.004 0.008,0.002 0.0217,0.005 0.0273,0.006 -0.006,-0.003 -0.011,-0.006 -0.0176,-0.008 -0.006,-0.001 -0.0118,-1.1e-4 -0.0176,-0.002 z m 4.96289,0.55468 c -0.27317,-0.0113 -0.57627,0.0659 -0.86914,0.15235 0.004,6.5e-4 0.008,2.5e-4 0.0117,0.002 0.0754,0.009 0.13987,0.0184 0.21289,0.043 0.008,0.003 0.0318,0.009 0.0234,0.0117 -0.009,0.003 -0.018,0.006 -0.0273,0.008 0.0352,-0.005 0.072,-0.009 0.10742,-0.01 0.0337,-4.9e-4 0.13412,0.0377 0.1836,0.0664 h 0.002 c 0.009,9.6e-4 0.0182,-3.2e-4 0.0273,0.002 0.0185,0.003 0.0365,0.01 0.0547,0.0156 h 0.002 c 0.0285,-0.001 0.0568,-0.002 0.10157,-0.004 0.0552,0.0133 0.098,0.0256 0.14453,0.0469 0.0108,-5.9e-4 0.0224,-0.002 0.0332,-0.002 0.009,1.5e-4 0.0616,0.0222 0.0937,0.0391 0.0114,-0.002 0.0238,-0.003 0.0371,-0.004 0.0343,-0.004 0.071,0.004 0.10547,0.0137 0.0613,-0.0259 0.1065,-0.0395 0.0488,0.006 0.0375,0.005 0.25813,0.0469 0.27929,0.084 0.009,0.0151 -0.0338,-0.009 -0.0508,-0.0137 -0.0619,0.017 -0.24772,0.0349 -0.18554,0.0508 0.0964,0.0249 0.19879,0.001 0.29882,-0.01 -0.008,0.004 0.0101,0.003 0.0371,0.002 -0.003,-10e-4 -0.007,-0.004 -0.0117,-0.006 -0.005,2.9e-4 -0.0103,0.002 -0.0156,0.002 0.003,-8e-4 0.006,-0.003 0.01,-0.004 0.002,9.9e-4 0.004,2.5e-4 0.006,0.002 0.003,-1.4e-4 0.005,1.1e-4 0.008,0 0.008,0.006 0.007,0.006 0.004,0.006 h 0.002 c 0.0182,-8.3e-4 0.0403,-0.002 0.0625,-0.002 0.0646,-0.0689 0.16843,-0.13187 0.0762,-0.22461 -0.16615,-0.16615 -0.46511,-0.25911 -0.8125,-0.27344 z m -0.13086,0.33789 c -0.018,3.8e-4 -0.0256,0.006 -0.0586,0.0195 0.036,-0.004 0.0714,-0.0121 0.10743,-0.0176 -0.0232,-0.001 -0.0385,-0.002 -0.0488,-0.002 z m 137.90039,21.40039 c 0.008,0.0106 0.0198,0.0352 0.0273,0.0527 -0.008,-0.0174 -0.016,-0.0326 -0.0273,-0.0527 z m -44.1875,21.63868 0.89062,1.05273 c 0.13146,-0.0194 0.20924,-0.0517 0.19141,-0.10937 0.14634,0.15157 0.29541,0.29788 0.45508,0.43554 0.10998,0.13349 0.23634,0.30837 0.31836,0.43555 0.0692,0.0724 0.0594,0.0598 0.1289,0.13477 0.012,0.0131 0.0437,0.0397 0.0527,0.0508 v 0.002 h 0.002 c 0.0177,0.0125 0.0333,0.0225 0.0742,0.0527 0.0277,0.0217 0.0362,0.0289 0.0566,0.0449 h 0.002 c -0.006,-0.008 0.0528,0.0293 0.31055,0.21679 0.13228,0.13242 0.26382,0.26616 0.39649,0.39844 0.0782,0.0783 0.15771,0.15603 0.23632,0.23438 0.0954,0.0943 0.18908,0.18808 0.28125,0.28515 0.0522,0.0277 0.0546,0.0342 0.21289,0.1836 0.0257,0.0264 0.0989,0.0513 0.0762,0.0801 -0.002,0.003 -0.007,0.005 -0.01,0.008 0.007,0.003 0.0123,0.006 0.0195,0.01 0.0185,-0.005 0.0361,-0.0108 0.0547,-0.0156 0.1217,0.0909 0.2262,0.2041 0.33203,0.3125 0.034,0.0415 0.0665,0.0915 0.10547,0.1289 0.0935,0.0904 0.20537,0.16187 0.30859,0.24219 8.8e-4,-0.0109 0.004,-0.0168 0.004,-0.0293 0,-0.18977 -1.01255,-1.20224 -2.25,-2.25 z m 0.56836,0.61132 c 0.0122,0.006 0.0364,0.0159 0.0781,0.0352 0.0281,0.0139 0.0609,0.0325 0.0937,0.0508 -0.0794,-0.0408 -0.14688,-0.0735 -0.17187,-0.0859 z m 6.43164,5.38868 3.55469,3.82031 c 0.0901,-1.3e-4 0.19768,0.0415 0.30664,0.14453 0.21857,0.20661 0.47584,0.37316 0.64062,0.48828 0.0491,0.0837 0.1225,0.14099 0.19922,0.21485 0.0113,0.011 0.0238,0.0238 0.0352,0.0332 0.0117,0.01 0.0298,0.0101 0.0449,0.0195 0.0752,0.0508 0.12526,0.0968 0.17969,0.16797 0.0144,0.0283 0.0115,0.0131 0.0742,0.0703 0.0431,0.0428 0.0858,0.0863 0.1289,0.12891 0.0419,0.0418 0.0831,0.083 0.125,0.125 0.0401,0.04 0.0791,0.0811 0.11914,0.12109 0.0457,0.0459 0.0929,0.0908 0.13867,0.13672 0.0378,0.038 0.0751,0.0753 0.11329,0.11328 0.0291,0.0321 0.0616,0.065 0.0918,0.082 0.11528,0.0724 0.21877,0.1571 0.3125,0.25586 0.0612,0.0737 0.0473,0.0525 0.1543,0.15821 0.0522,0.0556 0.10636,0.10567 0.16797,0.15039 0.0722,0.0565 0.1303,0.12864 0.19531,0.19335 0.005,0.005 0.0207,0.0234 0.0352,0.043 0.0261,0.0114 0.0515,0.023 0.0762,0.0371 0.028,0.016 0.0476,0.0445 0.0703,0.0664 0.0427,0.0424 0.074,0.0844 0.0937,0.13281 0.0104,0.009 0.0221,0.0228 0.0391,0.0391 0.11755,0.103 0.21921,0.22212 0.31446,0.34571 0.0722,0.0773 0.16149,0.13774 0.23633,0.21484 0.071,0.08 0.14864,0.15319 0.2246,0.22852 0.0745,0.0741 0.14858,0.15041 0.22266,0.22461 0.0854,0.0852 0.17044,0.16864 0.25586,0.2539 0.0949,0.0839 0.19249,0.16362 0.2832,0.25977 0.005,0.006 0.006,0.005 0.01,0.01 0.0102,-0.0386 0.0566,-0.0205 0.0566,-0.0762 0,-0.16339 -1.91251,-2.07587 -4.25,-4.25 z m 6.45898,6.39258 c -0.003,2.2e-4 -0.004,0.002 0,0.004 0.0266,0.0144 0.0542,0.0253 0.082,0.0371 -0.009,-0.01 -0.0188,-0.0186 -0.0293,-0.0273 -0.0102,-0.009 -0.0431,-0.0148 -0.0527,-0.0137 z m 5.54102,5.60742 3.44727,3.75 c 3.20713,3.49045 4.05273,4.20893 4.05273,3.44531 0,-0.16709 -1.68751,-1.85461 -3.75,-3.75 z m 10.96289,11.66211 c 0.039,0.046 0.099,0.12442 0.14844,0.19336 0.0378,0.0377 0.0757,0.0754 0.11328,0.11328 0.0646,0.0644 0.13024,0.12752 0.19336,0.19336 0.0854,0.0919 0.12168,0.12795 0.23242,0.2207 0.15345,0.16388 0.0749,0.0703 0.24609,0.3125 0.0255,0.0253 0.0327,0.0298 0.0352,0.0293 0.002,0.003 0.0172,0.0311 0.0762,0.13086 0.0332,0.0306 0.10317,0.10219 0.0762,0.0879 -0.007,-0.004 -0.0129,-0.008 -0.0195,-0.0117 0.0161,0.018 0.0203,0.0258 0.0371,0.0625 0.12001,0.096 0.20852,0.17339 0.26367,0.23828 l 0.004,-0.004 c 0.0174,-0.0182 0.0377,0.0374 0.0566,0.0566 0.24087,0.26202 0.73195,0.80797 0.91602,1.01172 h -0.002 c 0.026,0.0289 0.0488,0.0572 0.0723,0.0859 0.21739,-0.25254 -0.44808,-1.02736 -2.16211,-2.47852 z m 1.13867,1.33203 c -0.007,-0.005 -0.0125,-0.01 -0.0195,-0.0156 0.0174,0.0285 0.0308,0.0504 0.0527,0.0859 -0.0172,-0.036 -0.0258,-0.0542 -0.0332,-0.0703 z m -0.0195,-0.0156 c -0.011,-0.0181 -0.0238,-0.0392 -0.0332,-0.0547 -0.0457,-0.0251 -0.0913,-0.0525 -0.13672,-0.0781 0.0624,0.0487 0.11889,0.0922 0.16992,0.13281 z m -0.0332,-0.0547 c 0.005,0.003 0.0105,0.005 0.0156,0.008 -0.008,-0.009 -0.0179,-0.0189 -0.0371,-0.043 0.005,0.009 0.0155,0.0252 0.0215,0.0352 z m 6.58984,8.3711 c 0.0165,0.0248 0.0336,0.0486 0.0488,0.0742 0.0253,0.0421 0.0836,0.1337 0.10351,0.18164 0.0829,0.11315 0.15507,0.23187 0.20118,0.35742 0.0267,0.0284 0.053,0.0579 0.0801,0.0859 0.0272,0.0283 0.0783,0.0452 0.082,0.084 0.003,0.0259 -0.0931,-0.0408 -0.0742,-0.0234 0.14502,0.12881 0.36563,0.18157 0.4707,0.36329 0.0116,0.0156 0.2815,0.35375 0.5293,0.75195 0.033,0.0375 0.0645,0.0759 0.0976,0.11328 0.0589,0.0661 0.11846,0.13153 0.17774,0.19727 0.0924,-0.0431 0.14453,-0.15713 0.14453,-0.35743 0,-0.20764 -0.78751,-0.99515 -1.75,-1.75 -0.0707,-0.0555 -0.0467,-0.0277 -0.11133,-0.0781 z m 0.75,1.10156 c -0.0106,10e-4 -0.0276,0.023 -0.0391,0.0273 0.0136,0.0176 0.028,0.0361 0.041,0.0566 0.0518,0.0816 0.10328,0.16201 0.1543,0.24414 0.007,0.0115 0.0144,0.0234 0.0215,0.0352 0.002,-0.001 0.004,-0.002 0.006,-0.004 -0.017,-0.0749 -0.0358,-0.15242 -0.0566,-0.23438 -0.0247,-0.0968 -0.0693,-0.133 -0.12695,-0.125 z m -176.8887,72.2324 c -0.45312,0 -0.90625,0.0703 -1.25,0.20899 -0.68753,0.27741 -0.12499,0.5039 1.25,0.5039 1.3751,0 1.93753,-0.22651 1.25,-0.5039 -0.34375,-0.13871 -0.79688,-0.20899 -1.25,-0.20899 z m 11,0 c -0.45313,0 -0.90625,0.0703 -1.25,0.20899 -0.6875,0.27741 -0.12499,0.5039 1.25,0.5039 1.3751,0 1.9375,-0.22651 1.25,-0.5039 -0.34375,-0.13871 -0.79687,-0.20899 -1.25,-0.20899 z m -39.18945,10.8711 c -0.275,0 -1.31506,0.9 -2.31055,2 -0.99553,1.09999 -1.58374,2 -1.30859,2 0.27499,0 1.3131,-0.90001 2.30859,-2 0.99553,-1.1 1.5857,-2 1.31055,-2 z m 66.18945,0 c -0.0516,0.0516 0.25111,0.45697 0.87305,1.25 0.75484,0.9625 1.54249,1.75 1.75,1.75 0.82303,0 0.29269,-0.82059 -1.37305,-2.12696 -0.79302,-0.62193 -1.19838,-0.92466 -1.25,-0.87304 z m 176.2793,2.3789 c -0.0283,0.0283 -0.0317,0.2157 -0.0547,0.2793 0.0337,0.1165 0.0639,0.23467 0.0879,0.35352 0,-0.003 -0.009,0.002 -0.008,0.004 0.005,0.01 0.01,0.0181 0.0156,0.0274 v 0.002 c 0.0122,0.0189 0.0271,0.0382 0.0371,0.0586 0.0714,0.15307 0.0895,0.20835 0.0664,0.34766 0.0974,0.29819 0.20977,0.59172 0.29297,0.89453 0.003,0.01 0.006,0.0195 0.008,0.0293 0.15773,-0.41551 0.18526,-0.99782 -0.041,-1.5625 -0.15949,-0.39888 -0.29896,-0.53874 -0.40429,-0.4336 z m -0.084,2.16211 c 0.008,0.023 0.0163,0.0365 0.0254,0.0566 -0.008,-0.018 -0.0182,-0.0364 -0.0254,-0.0566 z m -247.38476,0.45899 c -0.275,0 -1.31506,0.9 -2.31055,2 -0.99553,1.09999 -1.58374,2 -1.30859,2 0.27499,0 1.3131,-0.90001 2.30859,-2 0.99549,-1.1 1.5857,-2 1.31055,-2 z m 76.68945,0.5 1.90625,2.25 c 1.79021,2.11445 2.59375,2.70454 2.59375,1.90429 0,-0.18977 -1.01251,-1.20225 -2.25,-2.25 z m 171.83008,2.93359 c 0.009,0.0253 0.0154,0.0405 0.0137,0.0195 0.0195,0.0985 0.0232,0.19755 0.0586,0.29297 0.0334,0.12366 0.0607,0.24202 0.0508,0.36523 -10e-5,0.001 1.2e-4,0.003 0,0.004 l 0.002,0.002 c 0.0404,0.13452 0.0402,0.10557 0.0391,0.16797 -4.5e-4,0.048 0.004,0.0969 -0.004,0.14453 -0.002,0.007 1e-4,0.017 0,0.0274 -2e-5,0.002 8e-5,0.004 0,0.006 0.005,0.0451 0.0105,0.0869 0.0176,0.14062 h 0.002 c 0.0365,8e-5 0.0277,0.0687 0.0391,0.10352 0.0805,0.25498 0.10472,0.36406 0.17578,0.63672 h 0.006 c 5.3e-4,0.002 5.5e-4,0.004 0.002,0.006 0.1474,-0.41628 0.17291,-0.98362 -0.0488,-1.53711 -0.13941,-0.34867 -0.25414,-0.4167 -0.35351,-0.37891 z m 0.0117,1.26953 c -0.0746,0.0292 -0.14874,0.0563 -0.22461,0.0781 2.2e-4,0.005 0.002,0.008 0.002,0.0137 0.13258,0.004 0.26689,0.0297 0.39844,0.0137 0.0227,-0.003 0.0257,-0.0682 0.004,-0.0742 -0.0588,-0.0149 -0.11941,-0.024 -0.17968,-0.0312 z m 1.125,5.75781 c -0.009,-0.003 -0.008,0.0672 -0.0156,0.0742 0.004,0.006 0.009,0.0123 0.0117,0.0195 0.0258,0.0679 0.0375,0.12468 0.0332,0.17579 0.016,0.0483 0.0132,0.0434 0.0195,0.11914 0.0118,0.0303 -0.005,0.0568 -0.0137,0.084 0.001,-0.005 0.004,-0.009 0.006,-0.0117 0.009,-0.0131 6.5e-4,0.0314 0.002,0.0469 9.3e-4,0.0408 -1e-5,0.0822 0,0.12304 7e-5,0.047 -1e-5,0.0937 0,0.14063 v 0.0625 c 0.004,0.0114 0.007,0.0214 0.01,0.0332 0.004,0.024 0.005,0.05 0.008,0.0742 -0.002,0.024 -0.003,0.0403 -0.004,0.0527 6.4e-4,0.0355 0,0.0719 0,0.10742 7e-5,0.0331 0,0.0663 0,0.0996 v 0.002 c 0.0233,0.057 0.0291,0.11762 0.0215,0.17969 0.003,-0.0152 -7.5e-4,0.0159 0.002,0.006 0.001,0.0404 0.003,0.0806 0.002,0.12109 0.002,0.008 0.0462,0.0239 0.0449,0.0449 0.005,0.005 0.0107,0.0131 0.0176,0.0234 0.0911,0.27708 0.0341,0.0601 0.0605,0.27344 0,0.007 0.0102,0.0104 0.0117,0.0176 0.0196,0.10014 0.0145,0.0801 0.0176,0.16601 -0.01,0.081 -0.01,0.16288 -0.008,0.24414 6.7e-4,0.0267 0.002,0.0534 0.002,0.0801 0.005,0.0172 0.0101,0.0387 0.0176,0.0703 0.003,0.01 0.004,0.0197 0.006,0.0293 0.17723,-0.68377 0.18619,-1.57317 -0.0547,-2.16992 -0.0692,-0.1719 -0.13679,-0.26662 -0.19726,-0.28907 z m 0.96289,9.33399 c -0.12964,0.0698 -0.22266,0.67383 -0.23438,1.70508 -0.0189,1.65001 0.18711,2.44655 0.46094,1.76953 0.27477,-0.67703 0.28836,-2.02703 0.0371,-3 -0.0953,-0.36488 -0.18581,-0.51647 -0.26367,-0.47461 z M 349.62891,331.7207 c -0.10515,0.10515 -0.17522,0.45465 -0.19922,1.03711 -0.0434,1.05417 0.19317,1.6448 0.52539,1.3125 0.33222,-0.33229 0.36803,-1.19414 0.0781,-1.91601 -0.15961,-0.39888 -0.29915,-0.53874 -0.40429,-0.4336 z m -106.8125,1.08203 c -0.18085,-0.0674 -0.3086,0.50782 -0.3086,1.53907 0,1.37499 0.22647,1.9375 0.50391,1.25 0.27742,-0.6875 0.27742,-1.8125 0,-2.5 -0.0693,-0.1719 -0.13499,-0.26662 -0.19531,-0.28907 z m 0,10 c -0.18085,-0.0674 -0.3086,0.50782 -0.3086,1.53907 0,1.37499 0.22647,1.9375 0.50391,1.25 0.27742,-0.6875 0.27742,-1.8125 0,-2.5 -0.0693,-0.1719 -0.13499,-0.26662 -0.19531,-0.28907 z m 107,1 c -0.18085,-0.0674 -0.3086,0.50782 -0.3086,1.53907 0,1.37499 0.22651,1.9375 0.50391,1.25 0.27742,-0.6875 0.27742,-1.8125 0,-2.5 -0.0693,-0.1719 -0.13511,-0.26662 -0.19531,-0.28907 z m 158.99609,9.72461 c -0.11943,0.11887 -0.2018,0.93946 -0.20898,2.31446 -0.0113,2.19997 0.18519,3.2178 0.43554,2.26172 0.24907,-0.9561 0.26305,-2.75609 0.0195,-4 -0.0896,-0.46647 -0.17466,-0.64748 -0.24609,-0.57618 z m -0.71289,11.07618 c -0.002,0.006 -0.006,0.0125 -0.008,0.0176 -0.004,0.055 6.8e-4,0.0255 -0.0195,0.0996 2.5e-4,0.005 0.002,0.0104 0.002,0.0156 0,0.0732 -0.0143,0.12485 -0.0332,0.20312 -0.0113,0.0175 -0.0276,0.0335 -0.0312,0.0527 0.004,-0.006 0.0168,-0.0258 0.0195,-0.0195 0.011,0.0249 -0.0549,0.23406 -0.0625,0.25976 -0.024,0.0883 -0.05,0.17551 -0.0762,0.26367 2.6e-4,-0.006 0.002,-0.01 0.004,-0.008 0.0287,0.0371 -0.0271,0.25895 -0.0195,0.28125 0.004,0.0488 0.007,0.0956 0.008,0.14453 -0.002,0.0417 -2.6e-4,0.0832 0,0.125 v 0.0879 0.004 c -0.008,0.0252 -0.0145,0.0509 -0.0215,0.0762 v 0.002 c 0.002,0.0368 0.004,0.0725 0.004,0.082 1.2e-4,0.0211 0.002,0.038 0.002,0.0645 0.003,0.0387 -0.009,0.0748 -0.0195,0.11133 0.005,0.13788 -0.0574,0.22592 -0.125,0.33008 0.0835,0.0945 0.18061,0.0684 0.29101,-0.20508 0.22063,-0.54677 0.21648,-1.32823 0.0859,-1.98828 z m -0.20899,0.89257 c -0.004,0.0132 -0.008,0.0259 -0.0117,0.0391 -0.004,0.008 0.008,-0.0143 0.0117,-0.0215 5.9e-4,-0.005 -1.8e-4,-0.0113 0,-0.0176 z m -0.0332,0.625 c -2.2e-4,0.005 0.002,0.0396 0.004,0.0762 10e-4,-0.0106 0.003,-0.0228 0.002,-0.0371 -0.003,-0.0337 -0.006,-0.0429 -0.006,-0.0391 z m -0.85937,5.99414 c -0.008,0.0234 -0.0159,0.0469 -0.0234,0.0703 0.002,0.0269 0.002,0.0532 0.004,0.0801 -0.0283,0.13547 -0.0318,0.27395 -0.0469,0.41016 -0.007,0.0223 -0.01,0.0373 -0.0137,0.0508 0.005,-0.01 0.008,-0.0111 0.006,0.0176 -0.004,0.0328 -0.008,0.0651 -0.0117,0.0977 -0.009,0.0485 -0.0103,0.0581 -0.0117,0.0586 l -0.002,-0.002 c 9.1e-4,-0.008 7.5e-4,-0.0188 0.002,-0.0254 -0.004,0.0217 -0.006,0.0445 -0.01,0.0664 0.1223,-0.18095 0.0363,0.0231 -0.0273,0.15625 7.7e-4,0.005 7.5e-4,0.0107 0.002,0.0156 0.003,0.0272 -7.5e-4,0.0595 -0.002,0.0859 0.006,0.0277 -0.004,0.0712 -0.0176,0.11328 v 0.002 c 0.012,0.0603 -0.005,0.13074 -0.0215,0.18945 -0.006,0.0414 -0.0152,0.0816 -0.0215,0.12305 -7.8e-4,0.005 -7.5e-4,0.0105 -0.002,0.0156 -5e-4,0.002 -7.5e-4,0.004 -0.002,0.006 -0.0107,0.0422 -0.0213,0.0845 -0.0371,0.125 -0.007,0.0181 -0.0284,0.0478 -0.0391,0.0625 -1.8e-4,0.001 -0.002,0.002 -0.002,0.004 v 0.002 c -4.1e-4,10e-4 4e-4,0.003 0,0.004 -0.002,0.006 -0.005,0.0113 -0.006,0.0176 -10e-4,0.006 -7.4e-4,0.0133 -0.002,0.0195 0.0135,-0.005 0.005,0.0196 -0.0117,0.0547 3e-5,0.017 -0.002,0.0318 -0.004,0.0469 0.0806,0.067 0.15178,0.19388 0.25781,0.0879 0.33222,-0.33222 0.36784,-1.19416 0.0781,-1.91601 -0.0141,-0.0354 -0.0213,-0.008 -0.0352,-0.0391 z m -0.0254,0.0781 c -0.005,0.0146 -0.009,0.0283 -0.0137,0.043 -0.004,0.0117 0.0119,-0.0192 0.0137,-0.0312 2.4e-4,-0.003 -3e-5,-0.008 0,-0.0117 z m -253.12305,0.64844 1.90625,2.25 c 1.04776,1.23748 2.06027,2.25 2.25,2.25 0.80024,0 0.20818,-0.80546 -1.90625,-2.59571 z m 253.00781,0.21679 c 10e-4,0.006 0.003,0.0131 0.004,0.0195 3.1e-4,-0.003 -1.2e-4,-0.005 0,-0.008 -0.002,-0.007 -0.003,-0.006 -0.004,-0.0117 z m -168.50781,0.28321 c -0.0516,-0.0514 -0.45696,0.25096 -1.25,0.87304 -0.9625,0.75489 -1.75,1.54253 -1.75,1.75 0,0.82303 0.82255,0.29249 2.12891,-1.37304 0.62194,-0.79307 0.92271,-1.19841 0.87109,-1.25 z m 168.48437,0.006 c -0.003,0.009 -0.006,0.0156 -0.01,0.0234 0.003,-0.006 0.006,-0.008 0.01,-0.0156 0,-0.002 -1.3e-4,-0.005 0,-0.008 z m -0.13671,0.50195 c -0.001,0.004 -0.001,0.0163 0.002,0.0352 4e-4,0.004 -3.1e-4,0.008 0,0.0117 0.001,-0.007 0.004,-0.012 0.004,-0.0176 -4e-5,-0.002 -3.5e-4,-0.006 0,-0.01 -3.3e-4,-0.017 -0.004,-0.0259 -0.006,-0.0195 z m -0.74415,4.21875 c -0.003,0.0104 -0.006,0.0214 -0.01,0.0312 -0.004,-0.008 -0.004,-0.0329 -0.008,-0.0254 -0.008,0.0159 0.0405,0.25133 -0.0332,0.29101 -0.0136,-0.0159 -0.0647,0.2672 -0.0723,0.25586 -0.008,-0.008 -0.0145,-0.0212 -0.0156,-0.0137 -0.0113,0.0707 0.008,0.14618 -0.0352,0.21875 -0.003,0.0189 -0.0299,0.17616 -0.0488,0.1875 -0.002,0.002 -0.002,2.8e-4 -0.002,-0.004 2.7e-4,0.0142 0.001,0.0326 -0.002,0.0234 -0.004,-0.008 -0.009,-0.0243 -0.0117,-0.0371 0.0131,0.0899 0.0137,0.0832 0.0137,0.0703 6.2e-4,0.007 0.002,0.0206 0.006,0.0605 -0.004,0.0975 10e-4,0.0781 -0.0215,0.19532 -0.004,0.0113 -0.0136,0.0179 -0.0156,0.0293 -0.002,0.0113 0.0113,0.0375 0,0.0352 -0.07,-0.0152 -0.14026,-0.0349 -0.20899,-0.0566 0.002,0.0233 0.005,0.046 0.008,0.0684 0.18515,0.0511 0.23876,0.0705 0.21485,0.13086 -0.001,0.006 -0.003,0.0102 -0.004,0.0156 0.002,-0.004 0.004,-0.008 0.006,-0.0117 -5.2e-4,0.009 -0.004,0.0287 -0.01,0.0371 0.002,-0.006 0.002,-0.0155 0.004,-0.0234 -0.005,0.008 -0.0109,0.0174 -0.0176,0.0273 0.002,3.2e-4 0.004,-3.3e-4 0.006,0 -0.004,0.006 -0.01,0.0223 -0.01,0.006 -0.001,0.002 -0.002,0.004 -0.004,0.006 -0.005,0.0269 -0.0145,0.0989 -0.041,0.27734 -0.005,0.0318 -0.008,0.0639 -0.0117,0.0957 0.0908,0.13649 0.19201,0.24547 0.32617,0.11133 0.33222,-0.33222 0.36784,-1.19416 0.0781,-1.91601 -0.0316,-0.079 -0.0502,-0.0271 -0.0801,-0.0859 z m -246.60351,0.27344 c -0.0516,0.0518 0.25111,0.45698 0.87305,1.25 1.30633,1.66575 2.12695,2.19607 2.12695,1.37304 0,-0.20749 -0.78751,-0.99515 -1.75,-1.75 -0.79304,-0.62199 -1.19838,-0.92463 -1.25,-0.87304 z m 73.81055,0 c -0.275,0 -1.31506,0.9 -2.31055,2 -0.99553,1.10003 -1.58374,2 -1.30859,2 0.27499,0 1.3131,-0.89997 2.30859,-2 0.99553,-1.1 1.5857,-2 1.31055,-2 z m -41.81055,14.1289 c -0.45312,0 -0.90625,0.0703 -1.25,0.20899 -0.68753,0.27741 -0.12499,0.5039 1.25,0.5039 1.3751,0 1.93753,-0.22641 1.25,-0.5039 -0.34375,-0.13871 -0.79688,-0.20899 -1.25,-0.20899 z m 11,0 c -0.45313,0 -0.90625,0.0703 -1.25,0.20899 -0.6875,0.27741 -0.12499,0.5039 1.25,0.5039 1.3751,0 1.9375,-0.22641 1.25,-0.5039 -0.34375,-0.13871 -0.79687,-0.20899 -1.25,-0.20899 z m 164,75.8711 c -0.0484,-0.0484 -0.47287,0.27123 -1.17773,0.82226 -0.0616,0.10621 -0.10556,0.22375 -0.18165,0.32227 -0.0884,0.14188 -0.17234,0.29154 -0.30273,0.40039 -0.0654,0.0559 -0.0865,0.13396 -0.13867,0.20312 -0.0745,0.10583 -0.13964,0.21965 -0.22656,0.31641 -0.0745,0.0926 -0.11507,0.20509 -0.20313,0.28711 -0.0355,0.0329 -0.0818,0.0963 -0.13281,0.15039 -0.0136,0.0113 -0.18163,0.22334 -0.13477,0.15039 0.005,-0.0149 0.007,-0.0221 0.0156,-0.0449 -0.0382,0.093 -0.0986,0.16393 -0.17578,0.23242 -0.0441,0.0438 -0.0874,0.0884 -0.13086,0.13281 0.31654,0.0463 0.98607,-0.53453 1.91797,-1.72265 0.62192,-0.79302 0.92272,-1.19837 0.87109,-1.25 z m -4.18945,5 c -10e-4,0 -0.007,0.008 -0.008,0.008 -0.007,0.0126 -0.0142,0.0248 -0.0215,0.0371 -0.005,-9e-4 0.0355,-0.0449 0.0293,-0.0449 z m -0.11133,0.16992 c -0.072,0.0987 -0.15327,0.19133 -0.23438,0.28125 -0.0752,0.0729 -0.15865,0.14001 -0.21875,0.22656 -0.0714,0.0869 -0.1511,0.16439 -0.23047,0.24414 -0.0359,0.0348 -0.0772,0.0675 -0.10742,0.10156 -0.0499,0.0741 -0.10163,0.14783 -0.15039,0.22266 -0.0688,0.0843 -0.14473,0.16204 -0.2207,0.24023 -0.059,0.031 -0.12369,0.0532 -0.17774,0.0918 -0.028,0.0217 0.0643,-0.0177 0.0957,-0.0332 -8e-4,0.001 -8.8e-4,0.003 -0.002,0.004 -0.0181,0.0246 -0.0279,0.0497 -0.043,0.0762 -0.0627,0.10809 -0.12609,0.217 -0.22852,0.29297 -0.0471,0.0889 -0.12632,0.15777 -0.19141,0.23242 -0.10242,0.11376 -0.15879,0.25115 -0.25781,0.36719 l -0.13281,0.13476 c -0.0386,0.0385 -0.0767,0.0771 -0.11524,0.11524 -0.0521,0.0521 -0.10295,0.10327 -0.15625,0.15429 -0.0563,0.0533 -0.13629,0.15009 -0.20507,0.21094 -0.13153,0.12057 -0.27082,0.23182 -0.39063,0.36523 l -0.24805,0.24805 c 0.39796,-0.18962 1.14649,-0.78572 2.01563,-1.74609 0.91098,-1.00658 1.3195,-1.69478 1.19922,-1.83008 z m -4.79297,5.83008 c -0.1299,0 -1.35121,1.23357 -2.08008,1.88867 -0.0245,0.0448 -0.0528,0.0885 -0.0898,0.125 -0.0613,0.0773 -0.0928,0.17402 -0.16016,0.24609 -0.004,0.007 -0.0125,0.0207 -0.0332,0.0527 -0.0473,0.0729 -0.0991,0.14013 -0.1543,0.20703 -0.0423,0.0575 -0.0352,0.0502 -0.0937,0.11328 -0.002,0.002 -0.005,0.004 -0.008,0.006 0.009,-0.0203 0.0345,-0.075 0.0234,-0.0566 -0.0151,0.0234 -0.0258,0.0497 -0.0371,0.0762 -0.0166,0.0238 -0.0357,0.0496 -0.0508,0.0723 -0.10848,0.12812 -0.22287,0.24995 -0.34571,0.36523 -0.0748,0.0745 -0.14083,0.16023 -0.22851,0.2207 -0.027,0.0177 -0.15282,0.15679 -0.15235,0.125 -0.0386,0.0753 -0.0907,0.15108 -0.14062,0.1875 -0.0707,0.0964 -0.12382,0.20541 -0.2168,0.28516 -0.0741,0.0673 -0.11896,0.15141 -0.18359,0.22852 -0.0722,0.0722 -0.14385,0.14734 -0.2168,0.21874 -0.0752,0.0718 -0.0827,0.0638 -0.10156,0.10157 -0.0272,0.0435 -0.0557,0.0949 -0.0937,0.1289 -0.004,0.003 -0.013,-5e-5 -0.0156,0.004 -0.0306,0.0523 -0.0424,0.0773 -0.0449,0.0859 0.002,-5.4e-4 0.007,-0.004 0.0117,-0.01 -0.0185,0.0254 -0.029,0.0422 -0.0781,0.11133 -0.0744,0.0673 -0.13943,0.13598 -0.19726,0.21875 -0.0416,0.0367 -0.0716,0.0762 -0.10938,0.125 -0.0605,0.0548 -0.0941,0.13837 -0.16406,0.1875 -0.0412,0.0333 -0.0308,0.0171 -0.0742,0.084 -0.0571,0.0915 -0.13075,0.16849 -0.20898,0.24219 -0.0654,0.0654 -0.13031,0.12993 -0.19531,0.19531 -0.0434,0.044 -0.0885,0.0874 -0.13282,0.13086 0.79253,-0.72192 1.10961,-0.88495 2.16602,-1.96679 2.14821,-2.19999 3.6814,-4 3.40625,-4 z m -13.6582,13.77929 c -0.1451,0.14673 -0.28915,0.29444 -0.44141,0.4336 -0.0612,0.0556 -0.11897,0.14101 -0.17187,0.19922 -0.12208,0.13519 -0.24959,0.26609 -0.37696,0.39648 -0.15337,0.15402 -0.30333,0.31127 -0.46094,0.46094 -0.19846,0.19109 -0.38253,0.39614 -0.57226,0.5957 -0.0794,0.0775 -0.16338,0.14927 -0.23633,0.23242 0.004,-0.0113 0.0154,-0.0408 0.008,-0.0332 -0.0119,0.01 -0.0118,0.0277 -0.0156,0.0391 -0.008,0.017 -0.0198,0.0358 -0.0274,0.0547 -0.0242,0.0469 -0.05,0.0788 -0.084,0.12109 l -0.0215,0.0234 c -0.11528,0.11565 -0.2305,0.22999 -0.34766,0.34375 -0.0896,0.0903 -0.17133,0.19054 -0.27149,0.26953 -0.12849,0.10621 -0.26092,0.20951 -0.37695,0.33008 -0.0378,0.0193 -0.0754,0.0393 -0.11328,0.0586 0.002,-0.001 0.008,0.004 0.004,0.004 -0.005,0.002 -0.0126,0.007 -0.0195,0.01 -0.0443,0.0326 -0.0853,0.072 -0.125,0.10937 -0.0763,0.0771 -0.15457,0.15293 -0.23243,0.22852 -0.10582,0.1096 -0.20012,0.23357 -0.33203,0.31445 -0.0287,0.0197 -0.0595,0.034 -0.0859,0.0566 -0.0136,0.0113 -0.0298,0.0316 -0.0449,0.043 -0.0148,0.01 -0.0337,0.0204 -0.0527,0.0312 0.004,-0.004 0.008,-0.007 0.004,-0.006 -0.009,0.005 -0.019,0.0114 -0.0273,0.0195 0.007,-0.004 0.0138,-0.007 0.0215,-0.0117 -0.004,0.003 -0.008,0.006 -0.01,0.008 -0.01,0.005 -0.01,0.005 -0.0156,0.008 -0.0287,0.0301 -0.0524,0.075 -0.0723,0.0976 -0.0778,0.0296 -0.16107,0.0477 -0.23633,0.082 -0.0106,0.0129 -0.0189,0.0244 -0.0293,0.0371 0.0313,-0.002 0.0786,-0.009 0.10157,-0.0156 0.0463,-0.0146 0.0823,-0.0484 0.0957,-0.0625 -0.007,0.0101 -0.0231,0.0309 -0.0469,0.0684 -0.1081,0.15194 -0.11798,0.14777 -0.28126,0.26758 -0.008,0.004 0.01,-0.005 0.0176,-0.008 0.0329,-0.017 0.0558,-0.0493 0.0898,-0.0645 -0.005,0.006 -0.0247,0.0267 -0.0332,0.0352 -0.0578,0.0643 -0.11398,0.12797 -0.16992,0.19336 -0.12599,0.15316 -0.27309,0.27255 -0.42969,0.38086 -0.11062,0.17566 -0.78711,0.86914 -0.71875,0.86914 0.27515,0 2.02487,-1.57501 3.89063,-3.5 1.45024,-1.49628 1.95494,-2.22262 2.24805,-2.72071 z m -4.42578,4.33985 c 10e-4,-10e-4 0.003,-0.003 0.004,-0.004 -0.004,0.002 -0.0102,0.006 -0.0137,0.008 0.002,-0.001 0.006,-0.002 0.01,-0.004 z m 0.90039,-0.80078 c 0.005,-0.004 0.01,-0.01 0.0156,-0.0137 -0.0208,0.0106 -0.0423,0.0192 -0.0625,0.0312 0.009,-0.003 0.0294,-0.01 0.0469,-0.0176 z m -6.03711,4.79101 c -0.0165,0.004 -0.088,0.0838 -0.10743,0.0918 0.0377,-0.0289 0.0736,-0.0596 0.10743,-0.0918 z m -0.82227,1.33594 c -0.0122,0.01 -0.0251,0.019 -0.0371,0.0293 -0.0933,0.0911 -0.1792,0.18713 -0.28125,0.26953 -0.0567,0.0461 -0.12186,0.0804 -0.17969,0.125 -0.0355,0.0272 -0.0695,0.0595 -0.10351,0.0859 -0.12246,0.0956 -0.23736,0.18184 -0.37305,0.25781 -0.0518,0.0291 -0.11216,0.0421 -0.16016,0.0762 -0.0219,0.0166 -0.0416,0.0436 -0.0605,0.0625 -0.12435,0.1251 -0.25148,0.26432 -0.41211,0.3418 -0.0552,0.0215 -0.0178,0.003 -0.082,0.0625 -0.10167,0.095 -0.20936,0.19482 -0.33594,0.25586 -0.2306,0.35501 -0.78244,0.98828 -0.64648,0.98828 0.27477,0 1.3131,-0.90001 2.30859,-2 0.27604,-0.30504 0.15937,-0.29534 0.36328,-0.55469 z m -96.94531,45.67773 c -0.34742,-0.0151 -0.74453,0.049 -1.10547,0.19336 -0.79771,0.31937 -0.55946,0.55552 0.60547,0.60352 1.05399,0.0435 1.64472,-0.19126 1.3125,-0.52344 -0.16615,-0.1663 -0.46511,-0.2587 -0.8125,-0.27344 z m -62.48438,1.53321 c -4.1e-4,0.0227 0.001,0.0258 -0.002,0.0371 7.3e-4,-0.0113 0.002,-0.022 0.002,-0.0371 z m 49.56641,0.47265 c -0.45313,0 -0.90625,0.0703 -1.25,0.20899 -0.6875,0.27741 -0.12499,0.5039 1.25,0.5039 1.3751,0 1.9375,-0.22641 1.25,-0.5039 -0.34375,-0.13871 -0.79687,-0.20899 -1.25,-0.20899 z m -10,0.99219 c -0.63438,0 -1.26875,0.0636 -1.75,0.18945 -0.9625,0.25134 -0.17499,0.45702 1.75,0.45704 1.92499,0 2.71249,-0.20558 1.75,-0.45704 -0.48125,-0.12585 -1.11563,-0.18945 -1.75,-0.18945 z" />
			<path
			   id="path4502"
			   style="fill:#4bd8b0;stroke-width:0.264583"
			   d="m 78.409167,33.427934 v 8.598958 8.598959 h 1.396296 c 1.67045,0 2.362314,0.421809 3.171383,1.935281 0.553069,1.034532 0.591696,1.436505 0.591696,6.13451 0,4.425479 -0.06079,5.149395 -0.507979,6.050275 -0.66484,1.339421 -1.804567,2.017183 -3.394625,2.018482 l -1.256771,0.0011 v 4.365624 4.365625 l 0.859896,0.0036 c 0.47294,0.0021 1.62306,0.183825 2.555399,0.403593 6.238279,1.470467 10.872205,7.386849 10.872205,13.88029 0,6.476939 -4.649774,12.413039 -10.872205,13.879769 -0.932339,0.21977 -2.082459,0.40159 -2.555399,0.40359 l -0.859896,0.004 v 5.15937 5.15938 h 1.692402 c 1.600351,0 1.736222,0.0499 2.499074,0.9188 1.152319,1.31241 1.361739,2.39301 1.363739,7.03782 0.0016,4.68244 -0.33075,6.15985 -1.630391,7.2533 -0.649579,0.54658 -1.069528,0.66508 -2.357477,0.66508 h -1.567347 v 7.9375 7.9375 h 1.295011 c 5.724551,0 13.676865,-1.66565 19.718176,-4.12999 C 125.02184,131.56707 139.22975,104.69062 133.42183,77.693964 129.16818,57.922072 113.65565,41.335846 94.122419,35.675342 89.8224,34.429244 83.397039,33.427934 79.704178,33.427934 Z m -2.677872,0.02945 c -0.0061,0 -0.01143,0.0011 -0.01757,0.0011 0.01029,5.8e-5 0.02072,1e-5 0.03101,0 -0.0051,-1.9e-5 -0.0084,-0.0011 -0.01344,-0.0011 z m -0.686263,0.03617 c -0.0019,1.72e-4 -0.0039,-1.3e-5 -0.0057,5.3e-4 0.0013,-2.4e-5 0.0033,-8e-6 0.0052,0 z m 1.549776,0.04496 c -7.94e-4,0.005 -0.0016,0.01037 -0.0026,0.01601 0.01479,-0.005 0.0042,-0.01042 0.0026,-0.01601 z m -6.808888,0.5364 c -0.0019,2.23e-4 -0.0034,7.94e-4 -0.0052,0.0011 2.64e-4,2.62e-4 7.93e-4,5.29e-4 0.0011,0.0011 h 5.29e-4 c 0.0021,-5.29e-4 0.0029,-0.0011 0.0036,-0.0016 z m -0.04806,0.07648 c -2.64e-4,0.0024 1.38e-4,0.0044 -5.29e-4,0.0067 5.29e-4,8.2e-5 0.0013,-7.9e-5 0.0021,0 -5.3e-4,-0.0021 -0.0011,-0.0045 -0.0016,-0.0067 z m -1.358572,0.141078 c -0.02498,0.0069 -0.04977,0.0033 -0.0739,0.01291 -0.0071,0.0029 -0.0013,0.0044 -0.0078,0.0072 0.02787,-0.0068 0.05289,-0.01294 0.08165,-0.02016 z m 0.436666,0.04289 c -0.0083,0.0034 -0.01132,0.0039 -0.01963,0.0072 -0.0084,0.0051 -0.01349,0.0088 -0.0067,0.0078 0.0073,-0.0013 0.01469,-0.0028 0.0217,-0.0052 -0.0024,-0.0039 0.0079,-0.0058 0.0047,-0.0098 z m 56.606366,7.257955 c 0.002,0.0028 0.005,0.0093 0.007,0.01394 -0.002,-0.0046 -0.004,-0.0086 -0.007,-0.01394 z m -20.00188,15.911692 c 1.01859,0 1.24821,0.149865 3.14141,2.050521 2.80924,2.820302 2.97395,4.177467 0.83406,6.866763 -1.54378,1.940131 -5.40648,5.532448 -6.6089,6.145879 -0.59923,0.305702 -1.58254,0.547254 -2.22674,0.547254 -0.946597,0 -1.357537,-0.174734 -2.290818,-0.973585 -0.62553,-0.535432 -1.59938,-1.558166 -2.164209,-2.272728 -1.950009,-2.466952 -1.367925,-4.041273 3.125909,-8.454782 3.299048,-3.240201 4.358418,-3.909322 6.189288,-3.909322 z M 76.270797,75.529238 c -0.09192,-0.0038 -0.196991,0.01294 -0.292489,0.05116 -0.211061,0.08446 -0.148035,0.146981 0.160197,0.159681 0.278961,0.01148 0.435163,-0.05057 0.347266,-0.138493 -0.04396,-0.04396 -0.123061,-0.06856 -0.214974,-0.07235 z m 34.452683,8.698696 c 4.54168,0 6.03056,0.296462 7.24658,1.443323 l 0.92036,0.868161 v 3.041677 c 0,3.451325 -0.23815,4.007096 -2.13114,4.972822 -0.90909,0.463786 -1.56039,0.521449 -5.86166,0.516247 -4.12703,-0.0049 -4.9952,-0.07748 -5.89783,-0.491958 -1.90931,-0.876763 -2.10511,-1.290609 -2.20451,-4.654497 l -0.0879,-2.98173 0.84026,-0.957048 c 1.2181,-1.387338 2.7273,-1.756997 7.17579,-1.756997 z m -46.505179,3.001883 c -0.0401,-0.0061 -0.06751,0.09055 -0.07545,0.283186 -0.01148,0.278916 0.05109,0.435186 0.139009,0.347265 0.08791,-0.08792 0.09736,-0.315949 0.02066,-0.506944 -0.03167,-0.07915 -0.06017,-0.119864 -0.08423,-0.123507 z m 0,4.497916 c -0.0401,-0.0061 -0.06751,0.09055 -0.07545,0.283186 -0.01148,0.278916 0.05109,0.435187 0.139009,0.347266 0.08791,-0.08792 0.09736,-0.315952 0.02066,-0.506944 -0.03167,-0.07915 -0.06017,-0.119864 -0.08423,-0.123508 z m 12.052496,12.111917 c -0.09192,-0.004 -0.196991,0.013 -0.292489,0.0512 -0.211061,0.0845 -0.148035,0.14699 0.160197,0.15969 0.278961,0.0115 0.435163,-0.0506 0.347266,-0.1385 -0.04396,-0.044 -0.123061,-0.0685 -0.214974,-0.0724 z m 24.225913,2.35025 c 0.42287,0.003 0.90362,0.12435 1.56218,0.31729 0.82991,0.24306 1.86617,1.07694 4.35632,3.50573 3.52708,3.44005 4.31239,4.60155 4.33979,6.41615 0.0166,1.10065 -0.0906,1.28052 -1.81023,3.02514 -1.00545,1.02007 -2.14953,2.02439 -2.54248,2.2319 -1.0953,0.57839 -2.34056,0.37398 -4.01009,-0.65784 -1.30017,-0.80355 -6.324755,-6.08765 -6.859015,-7.21351 -0.250399,-0.52768 -0.455268,-1.46993 -0.455268,-2.09341 0,-1.06784 0.127735,-1.26101 2.199865,-3.33314 1.639281,-1.63927 2.288621,-2.20524 3.218928,-2.19831 z m -66.537542,18.2547 c -0.0046,0.005 0.0613,0.0851 0.07752,0.1111 0.0083,-0.009 0.01667,-0.0245 0.02532,-0.0393 -0.02262,-0.0136 -0.09859,-0.0761 -0.102835,-0.0718 z m 1.475361,1.69602 c -0.02635,7.9e-4 -0.05271,0.001 -0.07906,0.002 l 0.07958,0.094 c 0.02405,-0.0115 0.04827,-0.0227 0.07235,-0.0341 z m 4.113445,4.34599 c -0.03576,0.0227 -0.07191,0.045 -0.108521,0.0661 0.009,0.008 0.03795,0.0399 0.04651,0.0475 0.03719,-0.0255 0.07046,-0.0504 0.10077,-0.0749 -0.0046,-0.005 -0.03331,-0.0326 -0.03876,-0.0387 z m 1.671215,1.44435 c -0.0055,0.01 -0.0113,0.0192 -0.01654,0.0289 0.01101,-0.005 0.02159,-0.0105 0.03256,-0.0155 z m 0.272851,0.231 c -0.01029,0.0454 -0.02037,0.0908 -0.03255,0.13539 l 0.01085,0.0134 c 0.0614,-0.0308 0.103552,-0.0403 0.137459,-0.046 -0.02043,-0.0175 -0.02021,-0.022 -0.04186,-0.0403 z m 24.450188,12.42508 c -0.0044,-1.2e-4 -0.0095,0.003 -0.01394,0.003 0.0036,0.001 0.0072,0.003 0.01085,0.004 0.0011,-0.002 0.0021,-0.004 0.0031,-0.006 z m 4.908743,0.93328 c -1.08e-4,0.006 2.25e-4,0.007 -5.29e-4,0.01 1.93e-4,-0.003 5.29e-4,-0.006 5.29e-4,-0.01 z" />
			<path
			   id="path4500"
			   style="fill:#46b898;stroke-width:0.999999"
			   transform="scale(0.26458333)"
			   d="m 475.39062,156.32031 c -0.0247,0.0174 -0.0484,0.0343 -0.0723,0.0527 l 0.23242,0.26172 c 0.0517,-0.0152 0.1018,-0.0291 0.14844,-0.0449 z m -1.35351,0.88281 c 0.007,0.0106 0.0207,0.0353 0.0254,0.0527 -0.009,-0.0173 -0.0149,-0.0326 -0.0254,-0.0527 z m -177.6875,34.13868 v 30.5 30.5 l 4.75,-0.004 c 6.00967,-0.005 10.3173,-2.56653 12.83008,-7.62891 1.69016,-3.40515 1.91992,-6.14096 1.91992,-22.86718 0,-17.75624 -0.14614,-19.27355 -2.23633,-23.1836 -3.0579,-5.72021 -5.67282,-7.3164 -11.98633,-7.3164 z m 102.08984,26 c -6.91982,0 -10.92349,2.52896 -23.39257,14.77539 -16.98456,16.68098 -19.18457,22.63118 -11.81446,31.95508 2.13479,2.70072 5.81548,6.56616 8.17969,8.58984 3.52736,3.01928 5.08054,3.67969 8.6582,3.67969 6.19699,0 11.22474,-2.94489 21.02539,-12.31836 14.80422,-14.15895 18.95944,-20.80323 17.54688,-28.04883 -0.4122,-2.11453 -3.1203,-5.65253 -8.33008,-10.88281 -7.1554,-7.18358 -8.02326,-7.75 -11.87305,-7.75 z m 20.04297,101 c -16.81319,0 -22.51725,1.39714 -27.12109,6.64062 l -3.17578,3.61719 0.33203,11.26953 c 0.37553,12.71391 1.1157,14.27805 8.33203,17.5918 3.41144,1.56653 6.69248,1.84085 22.29101,1.85937 16.25666,0.0195 18.71837,-0.19829 22.1543,-1.95117 7.15457,-3.64999 8.05469,-5.75054 8.05469,-18.79492 v -11.4961 l -3.47852,-3.28124 c -4.59602,-4.33458 -10.22326,-5.45508 -27.38867,-5.45508 z m -38.65234,83.00195 c -3.51611,-0.0262 -5.97031,2.11288 -12.16602,8.30859 -7.83167,7.83168 -8.31445,8.56368 -8.31445,12.59961 0,6.52902 2.5108,10.57417 13.84961,22.31055 10.40746,10.77237 14.7771,14.23196 19.91601,15.7793 6.58145,1.98172 9.16215,0.75491 18.64454,-8.86524 6.49931,-6.59384 6.90453,-7.27117 6.84179,-11.43164 -0.10367,-6.85833 -3.07165,-11.24778 -16.40234,-24.25 -9.41159,-9.17968 -13.32798,-12.33089 -16.46484,-13.25 -2.48903,-0.72921 -4.30607,-1.18926 -5.9043,-1.20117 z m -83.48047,30.99414 v 30 30 h 5.92383 c 4.86784,0 6.45505,-0.44786 8.91015,-2.51367 4.91203,-4.13318 6.16967,-9.71665 6.16211,-27.41406 -0.006,-17.55519 -0.79907,-21.63932 -5.15429,-26.59961 -2.88322,-3.28369 -3.39675,-3.47266 -9.44532,-3.47266 z m 14.29687,161.61133 c 0.0248,-1.4e-4 0.0435,0.003 0.0527,0.004 -0.008,0 -0.0277,-0.002 -0.0527,-0.004 z" />
			<path
			   id="path4498"
			   style="fill:#1ece9d;stroke-width:0.264583"
			   d="m 78.409166,33.453771 -2.315104,0.133326 c -8.406389,0.484984 -15.004251,2.161196 -22.125265,5.620329 -4.031568,1.958391 -8.259675,4.629714 -11.172444,7.058999 -11.037133,9.205113 -17.924359,21.442867 -20.098515,35.71255 -0.594167,3.899506 -0.593686,11.66213 0.0016,15.610417 1.777341,11.793908 6.819557,22.254908 14.824935,30.756778 9.602388,10.19793 23.080184,16.59719 36.916093,17.52761 0.15308,0.0103 0.186272,0.0125 0.337962,0.0227 5.3e-4,3e-5 5.3e-4,-3e-5 0.0011,0 h 0.0062 0.01035 0.0052 c 0.01572,0 0.03012,0.001 0.04289,0.004 5.29e-4,3e-5 5.29e-4,5.2e-4 0.0011,5.2e-4 1.327639,0.0892 2.680665,0.1796 2.96881,0.19896 l 0.595312,0.0403 v -7.9375 -7.9375 h -1.481613 c -1.323171,0 -1.574864,-0.0933 -2.353861,-0.8723 -1.229331,-1.22934 -1.453494,-2.36434 -1.44849,-7.32979 0.0037,-3.68864 0.08037,-4.53418 0.497125,-5.45186 0.80141,-1.7647 1.469396,-2.22105 3.249414,-2.22105 h 1.537201 v -5.15938 -5.15937 h -1.130165 c -4.563203,0 -10.004303,-3.79268 -11.966194,-8.340579 -1.927288,-4.467672 -1.467646,-10.153634 1.125514,-13.922663 2.56091,-3.722153 7.026706,-6.31176 10.884606,-6.31176 h 1.086239 v -4.365625 -4.365625 l -1.256771,-0.0011 c -1.590061,-0.0013 -2.729785,-0.679061 -3.394625,-2.018482 -0.422579,-0.851355 -0.522663,-1.734929 -0.596863,-5.256525 -0.107339,-5.091147 0.163385,-6.631778 1.396299,-7.93905 0.795509,-0.843484 1.002408,-0.924491 2.362128,-0.924491 h 1.489832 V 42.039809 Z M 51.565327,57.505017 c 1.789777,0 2.846131,0.699648 6.26215,4.148066 4.533945,4.576945 4.879555,5.794854 2.45463,8.653219 -0.802151,0.945528 -1.802778,1.964264 -2.223638,2.263944 -0.988144,0.70362 -2.732857,0.696762 -4.084505,-0.01601 -1.172342,-0.618432 -5.060786,-4.258625 -6.554636,-6.136058 -1.257523,-1.580417 -1.698509,-3.043152 -1.290363,-4.279841 0.174691,-0.529323 1.089607,-1.644558 2.264463,-2.760557 1.848239,-1.755651 2.046552,-1.872753 3.171899,-1.872753 z m -5.469951,26.722917 c 4.242449,0 5.880444,0.370773 7.056933,1.597834 0.748466,0.780608 0.786929,0.93744 0.872299,3.546554 0.112231,3.429934 -0.192529,4.145 -2.156973,5.059638 -1.286854,0.599152 -1.658877,0.638622 -6.002219,0.635622 -5.116737,-0.0036 -6.219486,-0.260543 -7.362859,-1.714109 -0.513964,-0.653404 -0.574641,-1.051038 -0.574641,-3.772378 v -3.041677 l 0.920356,-0.868161 c 1.216023,-1.146861 2.705412,-1.443323 7.247104,-1.443323 z m 10.221598,21.960416 c 0.930365,0 1.224777,0.20105 3.223577,2.19986 2.062576,2.06257 2.199865,2.26937 2.199865,3.31763 0,0.61527 -0.250896,1.61009 -0.558107,2.21227 -0.694399,1.36113 -5.553429,6.39427 -6.982518,7.23263 -1.092509,0.64091 -2.875261,1.01033 -3.571875,0.74053 -0.66761,-0.25856 -4.262077,-3.88744 -4.53409,-4.5775 -0.172516,-0.4376 -0.151704,-1.08273 0.06408,-1.98438 0.285639,-1.19348 0.672238,-1.69538 3.627168,-4.70617 3.475477,-3.54117 4.792231,-4.43487 6.5319,-4.43487 z m 12.946496,39.33197 c -1.08e-4,0.006 -1.06e-4,0.007 -5.29e-4,0.01 1.93e-4,-0.003 5.29e-4,-0.006 5.29e-4,-0.01 z" />
			<path
			   id="path4496"
			   style="fill:#17a57e;stroke-width:0.999999"
			   transform="scale(0.26458333)"
			   d="m 290.71875,191.3418 c -5.13914,0 -5.92108,0.30618 -8.92773,3.49414 -4.65982,4.94087 -5.68304,10.76373 -5.27735,30.00586 0.37807,17.93176 1.57115,22.14676 7.25586,25.61328 1.86849,1.13943 4.94845,1.88082 7.83008,1.88281 l 4.75,0.004 v -30.5 -30.5 z m -95.82617,26 c -4.25328,0 -5.00281,0.44259 -11.98828,7.07812 -4.4404,4.21795 -7.89835,8.43302 -8.5586,10.4336 -1.5426,4.67411 0.12414,10.20255 4.87696,16.17578 5.64605,7.09581 20.34252,20.85402 24.77343,23.1914 5.10859,2.69487 11.70278,2.71995 15.4375,0.0605 1.59065,-1.13265 5.37255,-4.98299 8.4043,-8.55664 9.16507,-10.80327 7.85883,-15.40639 -9.27734,-32.70508 -12.91094,-13.03339 -16.90346,-15.67773 -23.66797,-15.67773 z m -20.67383,101 c -17.16545,0 -22.79464,1.1205 -27.39063,5.45508 l -3.47851,3.28124 v 11.4961 c 0,13.17921 1.04516,15.52075 8.42187,18.87109 3.46876,1.57543 6.69478,1.85465 21.57813,1.86524 16.41578,0.0114 17.82185,-0.13783 22.68555,-2.40235 7.42467,-3.4569 8.57652,-6.15951 8.15234,-19.12304 -0.32266,-9.86122 -0.46803,-10.45397 -3.29688,-13.4043 -4.44674,-4.63771 -10.63742,-6.03906 -26.67187,-6.03906 z m 38.63281,83 c -6.57513,0 -11.55184,3.37777 -24.6875,16.76172 -11.16824,11.37936 -12.6294,13.2761 -13.70898,17.7871 -0.81555,3.40782 -0.89421,5.84594 -0.24219,7.5 1.02808,2.60811 14.61347,16.32355 17.13672,17.30079 2.63287,1.01971 9.37083,-0.37649 13.5,-2.79883 5.40128,-3.16861 23.76612,-22.19151 26.39062,-27.33594 1.16111,-2.27596 2.10938,-6.0359 2.10938,-8.36133 0,-3.96193 -0.51889,-4.74352 -8.31445,-12.53906 -7.55451,-7.55456 -8.66726,-8.31445 -12.1836,-8.31445 z m 77.6875,31 c -6.72763,0 -9.2523,1.72483 -12.28125,8.39453 -1.57523,3.46843 -1.86379,6.66415 -1.8789,20.60547 -0.0187,18.76705 0.82832,23.05684 5.47461,27.70312 2.94425,2.94429 3.89552,3.29688 8.89648,3.29688 h 5.59961 v -30 -30 z" />
		  </g>
		</svg>
		`;
  }

  async main() {
    return 0;
  }

  $getCache(path) {
    let md5 = _crypto.default.createHash('md5').update(path).digest("hex");

    let stat = null,
        data = null;

    let file = _path.default.posix.join(this.$cacheFolder, md5 + ".json");

    if (this.$cacheType == "javascript") {
      md5 = _path.default.basename(path) + "-" + md5;
      file = _path.default.posix.join(this.$cacheFolder, md5 + ".js");
    }

    try {
      stat = _fs.default.statSync(path);
    } catch (e) {}

    if (!stat) return null;
    if (!_fs.default.existsSync(file)) return;

    if (this.$cacheType == "javascript") {
      /*delete require.cache[file]
      data = require(file).default
      */
      let content = _fs.default.readFileSync(file, "utf8");

      let i = content.indexOf("// KAWIX END CACHE\n");
      data = JSON.parse(content.substring(13, i));
      i = content.indexOf("// KAWIX RESULT CODE\n");
      let y = content.lastIndexOf("// KAWIX RESULT CODE\n");

      if (data.result) {
        data.result.code = content.substring(i + 21, y);
      }
    } else {
      let content = _fs.default.readFileSync(file, "utf8");

      data = JSON.parse(content);
    }

    let mtimeMs = Math.ceil(stat.mtimeMs / 1000) * 1000;

    if (data.mtimeMs == mtimeMs) {
      return data;
    }
  }

  $saveCache(path, cache) {
    let md5 = _crypto.default.createHash('md5').update(path).digest("hex");

    if (this.$cacheType == "javascript") {
      md5 = _path.default.basename(path) + "-" + md5;
      let ncache = Object.assign({}, cache);
      let code = ncache.result.code;

      if (code) {
        delete ncache.result.code;
      }

      let str = [];
      str.push("var $_cache = ");
      str.push(JSON.stringify(ncache));
      str.push("// KAWIX END CACHE");
      str.push("");
      str.push("var $_func = function(){");
      str.push("// KAWIX RESULT CODE");
      str.push(code);
      str.push("// KAWIX RESULT CODE");
      str.push("}");
      str.push("");
      str.push(""); //str.push("var $_cache = // KAWIX RESULT JSON\n" + JSON.stringify(ncache, null, '\t') + "\n// KAWIX RESULT JSON")
      //str.push("var $_cache = { mtimeMs: Number($_vars[0]), requires: $_vars[1].split('$$?'), filename: $_vars[2], time: Number($_vars[3]), result: {}};")

      str.push("if($_cache.result){");
      str.push("\tvar $_lines = $_func.toString().split('\\n')");
      str.push("\t$_cache.result.code = $_lines.slice(2, $_lines.length - 2).join('\\n')");
      str.push("}");
      str.push("exports.default = $_cache");

      let file = _path.default.join(this.$cacheFolder, md5 + ".js");

      _fs.default.writeFileSync(file, str.join("\n"));
    } else {
      let file = _path.default.join(this.$cacheFolder, md5 + ".json");

      _fs.default.writeFileSync(file, JSON.stringify(cache));
    }
  }

  $addOriginalURL(file, url) {
    this.$originals.set(file, url);

    if (this.$originals.size > 100) {
      this.$originals.delete(this.$originals.keys().next().value);
    }
  }

  async $getNetworkContent(url) {
    let uri = new URL(url);

    let id = _crypto.default.createHash("md5").update(url).digest('hex');

    let ext = _path.default.extname(uri.pathname);

    let name = _path.default.basename(uri.pathname);

    if (!ext) name += ".ts";
    if (/^\.\d+$/.test(ext)) name += ".ts";
    if (ext == ".mjs") name += ".ts";

    let file = _path.default.join(this.$networkContentFolder, id + "-" + name);

    if (_fs.default.existsSync(file)) {
      this.$addOriginalURL(file, url);
      return {
        file
      };
    } // get if exists on $cache Folder


    let vfile = _path.default.posix.join("/virtual/$app-cache/network", id + "-" + name);

    let virtual = KModule.$files.get(vfile);

    if (virtual) {
      _fs.default.writeFileSync(file, virtual.content);

      this.$addOriginalURL(file, url);
      return {
        file,
        virtual: true
      };
    }

    let getContent = async function (url) {
      let def = {},
          redir = '';
      let promise = new Promise(function (a, b) {
        def.resolve = a;
        def.reject = b;
      });
      let items = {
        http: _http.default,
        https: _https.default
      };
      let userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
      userAgent = "Node/" + process.version;
      if (process.env.KW_USER_AGENT) userAgent = process.env.KW_USER_AGENT;
      let req = items[url.startsWith("http:") ? "http" : "https"].get(url, {
        timeout: Number(process.env.REQUEST_TIMEOUT || 8000),
        headers: {
          "user-agent": userAgent
        }
      }, function (res) {
        if (res.statusCode == 302) {
          redir = new URL(res.headers.location, url).href;
          return def.resolve();
        }

        if (res.statusCode != 200) {
          def.reject(new Error("Invalid status code from network response: " + String(res.statusCode) + " from " + url));
          return;
        }

        let buffers = [];
        res.on("data", function (bytes) {
          buffers.push(bytes);
        });
        res.on("end", function () {
          def.resolve(Buffer.concat(buffers));
        });
        res.on("error", def.reject);
      });
      req.on("error", def.reject);
      let c = await promise;

      if (redir) {
        return await getContent(redir);
      }

      return c;
    };

    let options = {
      [url]: true
    };
    let extSet = new Set();

    for (let id in KModule.extensionCompilers) {
      extSet.add(id);
    }

    for (let id in _module.default["_extensions"]) {
      extSet.add(id);
    }

    for (let ext of extSet) {
      options[`${uri.protocol}//${uri.host}${uri.pathname}${ext}${uri.search}`] = true;
    }

    let urls = Object.keys(options),
        error = null;

    for (let i = 0; i < urls.length; i++) {
      try {
        //console.log('\x1b[32m[kwruntime] Downloading:\x1b[0m', urls[i])
        let content = await getContent(urls[i]);

        _fs.default.writeFileSync(file, content);

        let source = _path.default.join(_path.default.dirname(file), "sources", _path.default.basename(file));

        _fs.default.writeFileSync(source, JSON.stringify({
          file,
          url: urls[i]
        }));

        this.$addOriginalURL(file, urls[i]);
        return {
          file,
          content
        };
      } catch (e) {
        error = e;
      }
    }

    if (error) throw error;
  }

  $generateRequireSync(parent) {
    let req = path => this.requireSync(path, parent, require);

    for (let id in require) {
      Object.defineProperty(req, id, {
        get() {
          return require[id];
        }

      });
    }

    return req;
  }

  requireSync(request, parent, originalRequire = null) {
    if (_module.default.builtinModules.indexOf(request) >= 0) {
      return _module.default["_load"](request, parent);
    }

    let resolv = this.importResolve(request, parent, true);
    let cached = this.$getCachedExports(resolv.request);

    if (cached) {
      return cached.data;
    }

    let getExports = () => {
      if (resolv.from == "virtual") {
        let file = resolv.virtual;
        let name = resolv.request;
        let exp = this.$modCache.get(name);
        if (exp) return exp; // module from virtual 

        let mod1 = new _module.default(name, module);
        mod1.filename = name;
        mod1["__kawix__virtual"] = true;
        let source = {
          stat: file.stat,
          content: file.content.toString()
        };

        if (file.transpiled) {
          mod1["requireSync"] = this.$generateRequireSync(mod1); // (path)=> this.requireSync(path, mod1)

          let content = `require = module.requireSync;${source.content}`;
          mod1["_compile"](content, name);
          cached = {
            module: mod1,
            mode: 'node',
            exports: mod1.exports,
            executed: true,
            content: source.content,
            result: {
              code: source.content
            },
            filename: name
          };
        } else {
          throw new Error("Not available for require: " + name);
        }

        return mod1.exports;
      }

      if (resolv.from != "node") {
        throw new Error(`${resolv.request} not available to be required in sync mode`);
      }

      global.kawix.disableCompile = true;

      try {
        let exp = null;

        if (originalRequire) {
          exp = originalRequire(resolv.request);
        }

        exp = _module.default["_load"](resolv.request, parent);
        cached = {
          module: _module.default["_cache"][resolv.request],
          mode: 'node',
          exports: exp,
          executed: true,
          filename: resolv.request
        };
        return exp;
      } catch (e) {
        throw e;
      } finally {
        global.kawix.disableCompile = false;
      }
    };

    let exports = getExports();

    if (cached) {
      if (cached) {
        cached.cacheTime = Date.now();
        cached.atime = Date.now();
      }

      this.$modCache.set(resolv.request, cached);
    }

    return exports;
  }

  getBinary(filename) {
    let bin = Kawix.$binaryFiles.get(filename);

    if (!bin) {
      bin = new BinaryData(this, filename);
    }

    return bin;
  }

  importResolve(request, parent = null, syncMode = false) {
    if (_module.default.builtinModules.indexOf(request) >= 0) {
      return {
        request
      };
    }

    if (request.startsWith("file://")) {
      request = _url.default.fileURLToPath(request);
    }

    if (!syncMode) {
      if ((request.startsWith("./") || request.startsWith("../") || request.startsWith("/")) && parent !== null && parent !== void 0 && parent.__kawix__network) {
        if (!request.startsWith("/virtual")) {
          let isfile = false;

          if (_path.default.isAbsolute(request)) {
            // maybe is a file 
            isfile = _fs.default.existsSync(request);
          }

          if (!isfile) {
            let newUri = new URL(request, parent.__kawix__meta.uri);
            let url = `${newUri.protocol}//${newUri.host}${newUri.pathname}${newUri.search}`;
            return {
              from: "network",
              request: url
            };
          }
        }
      }
    }

    let possibles = [];

    if ((request.startsWith("./") || request.startsWith("../")) && parent !== null && parent !== void 0 && parent.__kawix__virtual) {
      request = _path.default.posix.join(_path.default.posix.dirname(parent.filename), request);
    } else if (!_path.default.isAbsolute(request) && parent !== null && parent !== void 0 && parent.__kawix__virtual) {
      let dirname = _path.default.posix.dirname(parent.filename);

      while (dirname && dirname != "/" && dirname != ".") {
        possibles.push(_path.default.posix.join(dirname, "node_modules", request));
        dirname = _path.default.posix.dirname(dirname);
      }

      dirname = _path.default.posix.dirname(parent.filename);

      while (dirname && dirname != "/" && dirname != ".") {
        possibles.push(_path.default.posix.join(dirname, request));
        dirname = _path.default.posix.dirname(dirname);
      }
    }

    if (request.startsWith("/virtual") || possibles.length) {
      // read from virtual
      let file = null,
          name = '';
      possibles.push(request);

      for (let ext in KModule.extensionCompilers) {
        possibles.push(request + ext);
      }

      for (let i = 0; i < possibles.length; i++) {
        name = possibles[i];
        file = KModule.$files.get(name);

        if (file) {
          var _file$stat;

          if ((_file$stat = file.stat) !== null && _file$stat !== void 0 && _file$stat.isdirectory) {
            let f = _path.default.posix.join(name, "package.json");

            let psource = KModule.$files.get(f);

            if (psource) {
              let pjson = JSON.parse(psource.content.toString());
              if (pjson.main) possibles.push(_path.default.posix.join(name, pjson.main));
            }

            possibles.push(name + "/index.js");
            possibles.push(name + "/main.js");
            file = null;
            continue;
          }

          break;
        }
      }

      if (file) {
        return {
          from: "virtual",
          virtual: file,
          request: name
        };
      }
    } else if (request.startsWith("http://") || request.startsWith("https://")) {
      return {
        from: "network",
        request
      };
    } else if (request.startsWith("gh+/") || request.startsWith("github+/") || request.startsWith("github://")) {
      let parts = request.split("/");
      if (request.startsWith("github://")) parts.shift();
      let parts1 = parts[2].split("@");
      let name = parts1[0];
      let version = parts1[1] || "master";
      let url = `https://raw.githubusercontent.com/${parts[1]}/${name}/${version}/${parts.slice(3).join("/")}`;
      return {
        from: "network",
        request: url
      };
    } else if (request.startsWith("gitlab+/") || request.startsWith("gitlab://")) {
      let parts = request.split("/");
      if (request.startsWith("gitlab://")) parts.shift();
      let parts1 = parts[2].split("@");
      let name = parts1[0];
      let version = parts1[1] || "master";
      let url = `https://gitlab.com/${parts[1]}/${name}/-/raw/${version}/${parts.slice(3).join("/")}`;
      return {
        from: "network",
        request: url
      };
    }

    if (request.startsWith("npm://")) {
      let uri = new URL(request);
      return {
        from: "npm",
        request,
        uri
      };
    }

    request = _module.default["_resolveFilename"](request, parent);
    return {
      from: "node",
      request
    };
  }

  $getCachedExports(request) {
    let info = this.$modCache.get(request);
    if (!info) return;

    if (info.builtin) {
      return {
        data: info.exports
      };
    }

    if (info.mode == "node") {
      if (info.location) {
        return {
          data: require(info.location.main)
        };
      }

      if (info.exports) {
        return {
          data: info.exports
        };
      }
    }

    if (info.executed) {
      let hcache = this.$checkExports(info, request);

      if (hcache) {
        return null;
      }

      return {
        data: info.module.exports
      };
    }
  }

  $checkExports(info, request) {
    if (!info.module) return;
    let exports = info.module.exports;

    if (exports !== null && exports !== void 0 && exports.kawixDynamic) {
      var _exports$kawixDynamic;

      let time = (exports === null || exports === void 0 ? void 0 : (_exports$kawixDynamic = exports.kawixDynamic) === null || _exports$kawixDynamic === void 0 ? void 0 : _exports$kawixDynamic.time) || 15000;

      if (Date.now() > info.cacheTime + time) {
        // check if file is edited ...
        let stat = _fs.default.statSync(info.filename);

        if (stat.mtimeMs > info.atime) {
          this.$modCache.delete(request);
          delete require.cache[info.filename];
          return true;
        } else {
          info.cacheTime = Date.now();
        }
      }
    }
  }

  $convertToEsModule(mod) {
    if (!mod.__esModule) {
      // Babel need objects has __esModule property as true
      let nm = Object.create(mod);
      Object.defineProperty(nm, "__esModule", {
        value: true,
        enumerable: false
      });

      nm[_util.default.inspect.custom] = function (depth, options) {
        return _util.default.inspect(mod, options);
      };

      return nm;
    }

    return mod;
  }

  async importFromInfo(info) {
    if (info.builtin) {
      return info.exports;
    }

    if (info.mode == "npm") {
      var m = null;

      for (let item of info.items) {
        if (!m) {
          var _info$moduleLoader;

          if ((_info$moduleLoader = info.moduleLoader) !== null && _info$moduleLoader !== void 0 && _info$moduleLoader.secureRequire) {
            let tries = 0;

            while (true) {
              try {
                m = await info.moduleLoader.secureRequire(item);
                break;
              } catch (e) {
                if (e.message.indexOf("build/") >= 0 && e.code == "MODULE_NOT_FOUND") {
                  // es nativo posiblemente
                  tries++;
                  if (tries > 1) throw e; // volver a ejecutar node-gyp

                  console.info("> Trying build module again");
                  console.info();

                  var child = require("child_process");

                  var p = child.spawn("node-gyp", ["configure"], {
                    cwd: item.folder,
                    stdio: 'inherit'
                  });
                  await new Promise(function (a, b) {
                    p.once("error", b);
                    p.once("exit", a);
                  });
                  p = child.spawn("node-gyp", ["build"], {
                    cwd: item.folder,
                    stdio: 'inherit'
                  });
                  await new Promise(function (a, b) {
                    p.once("error", b);
                    p.once("exit", a);
                  });
                } // maybe using nodejs import?
                else if (e.message.indexOf("require() of ES") >= 0) {
                    m = await global["import"](item.main);
                    m = this.$convertToEsModule(m);
                  } else {
                    throw e;
                  }
              }
            }
          } else {
            m = require(item.main);
          }
        }
      }

      return m;
    }

    if (info.mode == "custom") {
      return info.load();
    }

    if (info.mode == "node") {
      if (info.location) {
        return require(info.location.main);
      } else if (!info.executed) {
        // compile 
        info.module["requireSync"] = this.$generateRequireSync(info.module); // (path)=> this.requireSync(path, info.module)

        info.module["_compile"](info.result.code, info.filename);
        return info.exports = info.module.exports;
      }
    }

    if (!info.executed) {
      let goodPreloadedModules = [];

      if (info.preloadedModules) {
        for (let i = 0; i < info.preloadedModules.length; i++) {
          let itemInfo = info.preloadedModules[i];
          let exp = await this.importFromInfo(itemInfo);
          goodPreloadedModules.push(exp);
        }

        let i = info.vars.names.indexOf("preloadedModules");
        info.vars.values[i] = goodPreloadedModules;
      }

      await this.defaultExecute(info, info.module.exports);
      info.executed = true;
      info.exports = info.module.exports;
      return info.exports;
    } else {
      return info.exports || info.module.exports;
    }
  }

  async import(request, parent = null, scope = null) {
    var _this$customImporter;

    if ((_this$customImporter = this.customImporter) !== null && _this$customImporter !== void 0 && _this$customImporter.length) {
      for (let importer of this.customImporter) {
        try {
          let mod = await importer(request, parent);
          if (mod) return mod;
        } catch (e) {}
      }
    }

    if (!request.startsWith(".")) {
      let cache = this.$getCachedExports(request);
      if (cache) return cache.data;
    }

    let info = await this.importInfo(request, parent, scope);
    return await this.importFromInfo(info);
  }

  async importInfo(request, parent = null, scope = null, props = {}) {
    var _this$customImportInf;

    if ((_this$customImportInf = this.customImportInfo) !== null && _this$customImportInf !== void 0 && _this$customImportInf.length) {
      for (let importer of this.customImportInfo) {
        try {
          let info = await importer(request, parent);
          if (info) return info;
        } catch (e) {}
      }
    }

    if (_module.default.builtinModules.indexOf(request) >= 0 || request.startsWith("node:")) {
      return {
        builtin: true,
        exports: _module.default["_load"](request, parent)
      };
    }

    if (!scope) {
      scope = new Map();
    }

    let resolv = this.importResolve(request, parent);
    let cached = this.$modCache.get(resolv.request);

    if (cached) {
      if (!this.$checkExports(cached, resolv.request)) return cached;
    }

    let item = scope.get(resolv.request);
    if (item) return item; // ensure not collapsing importing the same file at time

    let importing = this.$importing.get(resolv.request);

    if (importing) {
      let def = new Deferred();
      importing.defs.push(def);
      return await def.promise;
    } else {
      let error = null,
          result = null;
      let importing = {
        defs: [],
        name: resolv.request,
        time: Date.now()
      };

      try {
        this.$importing.set(importing.name, importing);
        result = await this.$importInfo(resolv, parent, scope, props);
        result.request = resolv.request;
      } catch (e) {
        error = e;
      }

      if (result) {
        result.cacheTime = Date.now();
        result.atime = Date.now();
        this.$modCache.set(resolv.request, result);

        if (result.vars) {
          let genname = result.vars.values[3];
          if (genname) this.$modCache.set(genname, result);
        }

        if (result.filename) this.$modCache.set(result.filename, result);
      }

      let defs = importing.defs;
      this.$importing.delete(importing.name);

      if (defs.length) {
        setImmediate(() => {
          for (let i = 0; i < defs.length; i++) {
            if (error) defs[i].reject(error);else defs[i].resolve(result);
          }
        });
      }

      if (error) throw error;
      return result;
    }
  }

  async $importInfo(resolv, parent, scope, props) {
    var _conv;

    let conv = null,
        meta = null;

    if (resolv.virtual) {
      let file = resolv.virtual;
      let name = resolv.request; // module from virtual 

      let mod1 = new _module.default(name, module);
      mod1.filename = name;
      mod1["__kawix__virtual"] = true;
      let source = {
        stat: file.stat,
        content: file.content.toString()
      };

      if (file.transpiled) {
        return {
          module: mod1,
          mode: 'node',
          filename: name,
          vars: {
            names: [],
            values: []
          },
          content: source.content,
          result: {
            code: `require = module.requireSync;${source.content}`
          },
          preloadedModules: []
        };
      } else {
        mod1["_compile"]("exports.__source = " + JSON.stringify(source) + ";exports.__kawix__compile = true; exports.__local__vars = { module, require, __dirname, __filename, global, Buffer }; exports.__filename = " + JSON.stringify(name), name);
        let base = {
          module: mod1,
          executed: false,
          filename: name,
          vars: {
            names: [],
            values: []
          },
          content: source.content,
          result: {
            code: `${source.content}`
          },
          requires: [],
          preloadedModules: []
        };
        scope.set(resolv.request, base);

        try {
          if (mod1.exports.__kawix__compile) {
            let result = await this.defaultCompile(mod1, props, scope);
            Object.assign(base, result);
          } else {
            base.executed = true;
          }

          return base;
        } catch (e) {
          scope.delete(resolv.request);
          throw e;
        }
      }
    } else if (resolv.request.startsWith("http://")) {
      let uri = new URL(resolv.request);
      let url = `${uri.protocol}//${uri.host}${uri.pathname}`;
      meta = {
        url,
        uri
      };
      conv = await this.$getNetworkContent(resolv.request);
    } else if (resolv.request.startsWith("https://")) {
      let uri = new URL(resolv.request);
      let url = `${uri.protocol}//${uri.host}${uri.pathname}`; // add ?target=node

      meta = {
        url,
        uri
      };
      let req = resolv.request;

      if (!process.env.KW_USER_AGENT) {
        if (req.startsWith("https://esm.sh/")) {
          if (req.indexOf("?") < 0) req += "?target=node";
        }
      }

      conv = await this.$getNetworkContent(req);
    } else if (resolv.request.startsWith("npm://")) {
      var _uri, _uri2;

      //let uri = new URL(resolv.request)
      let name = resolv.request.substring(6);
      let pindex = name.indexOf("?");
      let uri = new URL("http://127.0.0.1");

      if (pindex >= 0) {
        let search1 = name.substring(pindex);
        name = name.substring(0, pindex);
        uri = new URL("/index" + search1, "http://127.0.0.1");
      } //let name = (uri.username ? (uri.username + "@" + uri.host + uri.pathname) :  uri.pathname.substring(2))


      let loader = this.packageLoader;

      if ((_uri = uri) !== null && _uri !== void 0 && _uri.searchParams) {
        let ploader = uri.searchParams.get("loader");

        if (ploader) {
          loader = Kawix.packageLoaders[ploader] || loader;
        }
      }

      let mod = await this.import(loader, null, scope);
      let reg = new mod.Registry();

      for (let id in this.packageLoaderEnv) {
        reg.env[id] = this.packageLoaderEnv[id];
      }

      if ((_uri2 = uri) !== null && _uri2 !== void 0 && _uri2.searchParams && reg.env) {
        for (let key of uri.searchParams.keys()) {
          if (key.startsWith("ENV_")) {
            let envname = key.substring(4);
            let envvalue = uri.searchParams.get(key);
            reg.env[envname] = envvalue;
          }
        }
      }

      let items = await reg.resolve(name);
      if (!(items instanceof Array)) items = [items]; //return await reg.require(name)

      return {
        module: null,
        mode: 'npm',
        moduleLoader: reg,
        items,
        uri
      };
    }

    let filename = ((_conv = conv) === null || _conv === void 0 ? void 0 : _conv.file) || resolv.request;

    try {
      var _mod;

      let module = _module.default["_cache"][filename],
          mod = null;

      if (!module) {
        mod = _module.default["_load"](filename, parent);
        module = _module.default["_cache"][filename];
      }

      let base = {
        module,
        filename,
        executed: false,
        vars: {
          names: [],
          values: []
        },
        content: '',
        result: {
          code: ''
        },
        requires: [],
        preloadedModules: []
      };
      scope.set(resolv.request, base);

      if ((_mod = mod) !== null && _mod !== void 0 && _mod.__kawix__compile) {
        meta = Object.assign(meta || {}, props);
        let result = await this.defaultCompile(module, meta, scope);
        Object.assign(base, result);
      } else {
        base.executed = true;
        base.content = _fs.default.readFileSync(filename, 'utf8');
        base.result.code = base.content;
      }

      return base;
    } catch (e) {
      scope.delete(resolv.request);
      throw e;
    }
  }
  /*
  async $import(resolv:any, parent, scope: Map<string, any>){
  		let info = await this.$importInfo(resolv, parent, scope)
  	let cached = {
  		exports: await getExports(),
  		time: Date.now()
  	}
  
  	
  	this.$modCache.set(resolv.request, cached)
  	return cached.exports
  }*/


  async $enableEsbuildTranspiler() {
    let file = _path.default.join(this.$mainFolder, "esbuild.js");

    if (!_fs.default.existsSync(file)) {
      await this.$installEsbuild();
    }

    this.$esbuildTranspiler = require(file);
    this.transpiler = 'esbuild';
  }

  async $installEsbuild(version = 'latest') {
    let id = parseInt(String(Date.now() / (24 * 3600000))) + ".json";
    let pack = await this.import("https://unpkg.com/esbuild@" + (version || 'latest') + "/package.json?date=" + id);
    version = pack.version;
    let mod = await this.import(this.packageLoader);
    let reg = new mod.Registry();
    let desc = await reg.resolve("esbuild@" + version);

    let file = _path.default.join(this.$mainFolder, "esbuild.js");

    _fs.default.writeFileSync(file, "module.exports = require(" + JSON.stringify(desc.main) + ")");

    return file;
  }

  async compileSource(source, options) {
    let original = this.$originals.get(options.filename);
    console.log('\x1b[32m[kwruntime] Compiling:\x1b[0m', original || options.filename); // COMPILE DEFAULT TYPESCRIPT SOURCE 

    let result = null,
        requires = [],
        nhead = []; // STRIP BOM

    source = source.replace(/^\uFEFF/gm, "").replace(/^\u00BB\u00BF/gm, ""); // IF #!....

    if (source.startsWith("#!")) {
      let i = source.indexOf("\r") || source.indexOf("\n");
      if (i > 0) source = source.substring(i + 1);
      if (source[0] == "\n") source = source.substring(1);
    } //console.info("Using transpiler:", this.transpiler)


    let b = "//KWCORE--STARTING--LINE\n",
        transpiled = '';
    let fname = options.filename;

    if (!fname.endsWith(".ts")) {
      fname += ".ts"; // for correct transformation
    }

    if (source.indexOf("\n//KWRUNTIME-DISABLE-TRANSPILATION\n") >= 0) {
      result = {
        code: b + source
      };
    } else {
      if (this.transpiler == "babel") {
        result = global.Babel.transform(b + source, {
          filename: fname,
          "plugins": Object.values(global.BabelPlugins).concat(options.plugins || []),
          presets: [[global.Babel.availablePresets["env"], {
            "targets": {
              node: 12
            }
          }], global.Babel.availablePresets["typescript"]],
          compact: false
        });
        transpiled = 'babel';
      } else if (this.transpiler == "esbuild") {
        b = "var $$$n_import = import.meta;" + b;

        let file = _path.default.join(this.$mainFolder, "esbuild.js");

        if (!this.$esbuildTranspiler) {
          try {
            this.$esbuildTranspiler = require(file);
          } catch (e) {
            throw new Error("Please use 'kwrun --transpiler=esbuild' to enable esbuild transpiler");
          }
        } // async or sync??
        //result = this.$esbuildTranspiler.transformSync(b + source, {


        result = await this.$esbuildTranspiler.transform(b + source, {
          loader: 'ts',
          format: 'cjs',
          target: 'node12'
        });
        transpiled = 'esbuild';
      } else {
        throw new Error("Transpiler " + this.transpiler + " not supported");
      }
    } // get imports 


    let aliases = {};
    let head_i = result.code.indexOf(b),
        z = 0,
        changed = false;
    /*
    if((head_i < 0) && (transpiled == "babel")){
    	head_i = result.code.indexOf("\nfunction _interopRequireDefault(")
    	if(head_i < 0)
    		head_i = result.code.indexOf("\nfunction _interopRequireWildcard(")
    }*/

    if (head_i < 0 && transpiled == "esbuild") {
      // some little transformations to match Babel transform code style
      let find = "var $$$n_import = import_meta;";
      head_i = result.code.indexOf(find);
      let h = result.code.substring(0, head_i).replace("const import_meta = {};", "const import_meta = importMeta.meta;");
      let bod = result.code.substring(head_i + find.length);

      while (bod.indexOf("Promise.resolve().then(() => __toModule(require(") >= 0) {
        bod = bod.replace("Promise.resolve().then(() => __toModule(require(", "((asyncRequire(");
      }

      while (bod.indexOf("Promise.resolve().then(() => __toESM(require(") >= 0) {
        bod = bod.replace("Promise.resolve().then(() => __toESM(require(", "((asyncRequire(");
      }

      result.code = h + bod;
    }

    if (head_i < 0) {
      head_i = result.code.length;
    }

    if (head_i >= 0) {
      let head = result.code.substring(0, head_i);
      let lines = head.split(/\n/g);

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.indexOf("require(\"") >= 0) {
          let mod = line.match(/require\(\"([^\"]+)\"\)/)[1],
              alias = '';
          let i = mod.indexOf("##");

          if (i > 0) {
            alias = mod.substring(i + 2);
            mod = mod.substring(0, i);
            aliases[alias] = z;
          }

          changed = true;

          if (aliases[mod] !== undefined) {
            line = line.replace(/require\(\"([^\"]+)\"\)/, "preloadedModules[" + aliases[mod] + "]");
          } else {
            if (/kwruntime\/core(\@[0-9\.A-Za-z]+)?\/src\/kwruntime(\.ts)?$/.test(mod)) {
              // Internal module
              line = line.replace(/require\(\"([^\"]+)\"\)/, "{Kawix: global.kawix.$class, KModule:KModule, kawix: global.kawix}");
            } else {
              requires.push(mod);
              line = line.replace(/require\(\"([^\"]+)\"\)/, "preloadedModules[" + String(z++) + "]");
            }
          }
        }

        nhead.push(line);
      }
    }

    if (changed) {
      result.code = nhead.join("\n") + result.code.substring(head_i);
    }

    return {
      content: source,
      result,
      requires
    };
  }

  async defaultExecute(info, exports) {
    let code = info.result.code,
        func;

    if (info.filename) {
      let vm = require("vm");

      func = new vm.compileFunction(info.result.code, info.vars.names, {
        filename: info.filename
      });
    } else {
      func = Function(info.vars.names.join(","), info.result.code);
    }

    await func.apply(func, info.vars.values);
    delete exports.__kawix__compile;

    if (exports.kawixPreload) {
      await exports.kawixPreload();
    }

    return exports;
  }

  async defaultCompileAndExecute(module, meta, scope = null) {
    let info = await this.defaultCompile(module, meta, scope);
    return await this.defaultExecute(info, module.exports);
  }

  async defaultCompile(module, meta = null, scope = null) {
    let data = module.exports;
    if (!scope) scope = new Map();
    module.__kawix__compiled = true;
    let filename = data.__filename;
    let cache = data.__cache,
        savecache = false;

    if (!filename.startsWith("/virtual")) {
      cache = this.$getCache(filename);
      savecache = true;
    }

    let content = null,
        requires = [],
        nhead = [],
        result = null;

    if (meta !== null && meta !== void 0 && meta.url) {
      module.__kawix__network = true;
      module.__kawix__meta = meta;
      data.__local__vars["__filename"] = `/$NETWORK/${meta.uri.protocol.replace(":", "")}${meta.uri.pathname}`;
      data.__local__vars["__dirname"] = _path.default.normalize(_path.default.join(data.__local__vars["__filename"], ".."));
      data.__local__vars["importMeta"] = {
        meta
      };
    } else {
      data.__local__vars["importMeta"] = {
        meta: {
          url: "file://" + filename,
          main: meta === null || meta === void 0 ? void 0 : meta.main
        }
      };
    }

    module.__kawix__filename = filename;
    let kmodule = data.__local__vars["KModule"] = new KModule(module);
    data.__local__vars["asyncRequire"] = kmodule.import.bind(kmodule); //let originalRequire = data.__local__vars["require"]

    data.__local__vars["require"] = this.$generateRequireSync(module); //(request)=> this.requireSync(request, module) 

    let keys = Object.keys(data.__local__vars);
    let values = Object.values(data.__local__vars);
    values.push(data);
    keys.push("exports");

    if (!cache) {
      content = (data.__source || {}).content;

      if (content) {
        if (content.startsWith("// ESBUILD PACKAGE")) {
          // esbuild so ignore babel generation
          module._compile(content, filename);

          return;
        } else {
          let info = await this.compileSource(content, {
            filename
          });
          result = info.result;
          requires = info.requires;
        }
      } else {
        let compiler = null;

        for (let id in KModule.extensionCompilers) {
          if (filename.endsWith(id)) {
            compiler = KModule.extensionCompilers[id];
            break;
          }
        }

        compiler = compiler || KModule.extensionCompilers[".ts"];
        let info = await compiler(filename, module);
        if (!info) return;
        result = info.result;
        requires = info.requires;
      }

      let stat = (data.__source || {}).stat;
      if (!stat) stat = _fs.default.statSync(filename);
      cache = {
        mtimeMs: Math.ceil(stat.mtimeMs / 1000) * 1000,
        content,
        result: {
          code: result.code
        },
        requires,
        filename,
        time: Date.now()
      }; // save cache

      if (savecache) this.$saveCache(filename, cache);
    } else {
      content = cache.content;
      requires = cache.requires;
      result = cache.result;
    }

    let preloadedModules = [];

    if (requires.length > 0) {
      // resolve first the requires ...
      keys.push("preloadedModules");
      values.push(preloadedModules);
      let kitems = {};

      for (let i = 0; i < requires.length; i++) {
        let parts = requires[i].split("/");

        if (kitems[parts[0]]) {
          let location = {};

          if (parts.length == 1) {
            location.main = kitems[parts[0]].main;
          } else {
            location.main = _path.default.join(kitems[parts[0]].folder, parts.slice(1).join("/"));
          }

          preloadedModules.push({
            mode: 'node',
            location
          });
        } else {
          let imInfo = await this.importInfo(requires[i], module, scope);

          if (imInfo.mode == "npm") {
            for (let item of imInfo.items) {
              kitems[item.name] = item;
            }
          }

          preloadedModules.push(imInfo);
        }
      }
    }

    return {
      module,
      filename,
      vars: {
        names: keys,
        values
      },
      content,
      requires,
      result,
      preloadedModules
    };
  }

  $init() {
    this.originalArgv = process.argv;
    this.appArguments = process.argv.slice(2);
    let offset = 0,
        yet = false;

    for (let i = 0; i < this.appArguments.length; i++) {
      let arg = this.appArguments[i];

      if (arg.startsWith("--")) {
        let vl = arg.split("=");
        let name = vl[0].substring(2);
        let value = (vl[1] || "").trim();
        this.$startParams[name] = value;
        this.$startParams[name + "_Array"] = this.$startParams[name + "_Array"] || [];
        this.$startParams[name + "_Array"].push(value);
        this.optionsArguments.push(arg);
        if (!yet) offset++;
      } else {
        yet = true;
        this.$startParams[".values"] = this.$startParams[".values"] || [];
        this.$startParams[".values"].push(arg);
      }
    }

    if (offset > 0) this.appArguments = this.appArguments.slice(offset);
    this.mainFilename = this.appArguments[0];

    let folder = process.env.RUNTIME_CACHE_FOLDER || _path.default.join(_os.default.homedir(), ".kawi");

    if (!folder.startsWith("/virtual")) {
      if (!_fs.default.existsSync(folder)) _fs.default.mkdirSync(folder);
      this.$mainFolder = folder;
      folder = _path.default.join(folder, "genv2");
      if (!_fs.default.existsSync(folder)) _fs.default.mkdirSync(folder);
      this.$cacheFolder = folder;

      if (this.$cacheType == "javascript") {
        this.$cacheFolder = _path.default.join(this.$mainFolder, "compiled");
        if (!_fs.default.existsSync(this.$cacheFolder)) _fs.default.mkdirSync(this.$cacheFolder);
      }

      folder = _path.default.join(folder, "network");
      if (!_fs.default.existsSync(folder)) _fs.default.mkdirSync(folder);
      this.$networkContentFolder = folder;
    } else {
      this.$mainFolder = folder;
      this.$cacheFolder = _path.default.posix.join(folder, "genv2");
      this.$networkContentFolder = _path.default.posix.join(folder, "network");
    }

    let sourceFolder = _path.default.join(this.$networkContentFolder, "sources");

    if (!_fs.default.existsSync(sourceFolder)) _fs.default.mkdirSync(sourceFolder);

    let esbuild = _path.default.join(this.$mainFolder, "esbuild.js");

    if (_fs.default.existsSync(esbuild)) {
      try {
        this.$esbuildTranspiler = require(esbuild);
        this.transpiler = 'esbuild';
      } catch (e) {
        console.info("> Failed set transpiler=esbuild");
      }
    }
  }

} // register .ts, .js extension


exports.Kawix = Kawix;

_defineProperty(Kawix, "$binaryMetadata", new Map());

_defineProperty(Kawix, "$binaryFiles", new Map());

_defineProperty(Kawix, "$modulesData", new Map());

_defineProperty(Kawix, "packageLoaders", {
  "yarn": "github://kwruntime/std@34542ea/package/yarn.ts",
  //yarn: "/home/james/projects/Kodhe/kwruntime/std/package/yarn.ts",
  "pnpm": "github://kwruntime/std@0f85509/package/pnpm.ts" //pnpm: "/home/james/projects/Kodhe/kwruntime/std/package/pnpm.ts"

});

let Zlib = null;

async function BinaryTypescript(filename, module, options) {
  let fd = _fs.default.openSync(filename, "r");

  let buffer = Buffer.allocUnsafe(500);

  _fs.default.readSync(fd, buffer, 0, 500, 0);

  let str = buffer.toString('binary');
  let lines = str.split("\n");
  let line = lines[0],
      offset = 0;

  if (line.startsWith("#!")) {
    offset += line.length + 1;
    line = lines[1];
  }

  offset += line.length + 1;
  let bytes = Buffer.from(line, "binary");
  let sourceLen = bytes.readInt32LE(0);
  let binaryMetaLen = bytes.readInt32LE(4);
  buffer = Buffer.allocUnsafe(sourceLen);

  _fs.default.readSync(fd, buffer, 0, buffer.length, offset);

  let compressType = bytes.slice(8, 9).toString();

  let getString = function (buffer) {
    if (compressType == "g") {
      if (!Zlib) Zlib = require("zlib");
      buffer = Zlib.gunzipSync(buffer);
    } else if (compressType == "z") {
      if (!Zlib) Zlib = require("zlib");
      buffer = Zlib.inflateSync(buffer);
    } else if (compressType == "b") {
      if (!Zlib) Zlib = require("zlib");
      buffer = Zlib.brotliDecompressSync(buffer);
    } else {
      buffer = buffer.toString();
    }

    return buffer;
  };

  let source = getString(buffer);
  offset += sourceLen + 1;
  buffer = Buffer.allocUnsafe(binaryMetaLen);

  _fs.default.readSync(fd, buffer, 0, buffer.length, offset);

  let metadata = JSON.parse(getString(buffer));
  let binary = {
    metadata,
    start: offset,
    length: binaryMetaLen,
    data: {
      offset: 0,
      length: 0
    },
    filename
  };
  binary.data.offset = binary.start + binaryMetaLen;

  let stat = _fs.default.fstatSync(fd);

  binary.data.length = stat.size - binary.data.offset;
  source = `exports.__binary = ${JSON.stringify(binary)};\n${source}`;
  let cmeta = Kawix.$binaryMetadata.get(filename);

  if (cmeta !== null && cmeta !== void 0 && cmeta.fd) {
    _fs.default.closeSync(cmeta.fd);
  } //console.info(filename, binary)


  Kawix.$binaryMetadata.set(filename, binary);
  return await processTypescript(filename, source, options);
}

async function Typescript(filename, module, options) {
  let content = _fs.default.readFileSync(filename, "utf8"); // strip - bom  & bash env


  content = content.replace(/^\uFEFF/gm, "").replace(/^\u00BB\u00BF/gm, "");

  if (content.startsWith("#!")) {
    let i = content.indexOf("\r");
    if (i < 0) i = content.indexOf("\n");
    if (i > 0) content = content.substring(i + 1);
    if (content[0] == "\n") content = content.substring(1);
  }

  return await processTypescript(filename, content, options);
}

async function processTypescript(filename, source, options) {
  if (source.startsWith("// ESBUILD PACKAGE")) {
    module["_compile"](source, filename);
  } else {
    let info = await global.kawix.compileSource(source, Object.assign({}, options, {
      filename
    }));
    return info;
  }
}

KModule.addExtensionLoader(".ts", {
  compile: Typescript
});
KModule.addExtensionLoader(".kwb", {
  compile: BinaryTypescript
});
KModule.addExtensionLoader(".kwc", {
  compile: BinaryTypescript
});
let defaultJs = _module.default["_extensions"][".js"];
KModule.addExtensionLoader(".js", {
  compile: Typescript,
  preload: function (module, filename, defaultPreload) {
    var _module$parent;

    if ((_module$parent = module.parent) !== null && _module$parent !== void 0 && _module$parent["__kawix__compiled"] && !global.kawix.disableCompile) {
      defaultPreload();
    } else {
      defaultJs(module, filename);
    }
  }
});