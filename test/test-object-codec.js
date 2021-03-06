var modes = require('../lib/modes.js');
var bodec = require('bodec');
var sha1 = require('git-sha1');
var run = require('./run.js');

// The thing we mean to test.
var codec = require('../lib/object-codec.js');

var blobHash, treeHash, commitHash, tagHash;
var blob, tree, commit, tag;
var blobBin, treeBin, commitBin, tagBin;

run([
  function testEncodeBlob() {
    blob = "Hello World\n";
    blobBin = codec.frame({type: "blob", body: blob});
    blobHash = sha1(blobBin);
    if (blobHash !== '557db03de997c86a4a028e1ebd3a1ceb225be238') {
      throw new Error("Invalid blob hash");
    }
  },
  function testEncodeTree() {
    tree = {
      "greeting.txt": {
        mode: modes.file,
        hash: blobHash
      }
    };
    treeBin = codec.frame({type: "tree", body: tree});
    treeHash = sha1(treeBin);
    if (treeHash !== "648fc86e8557bdabbc2c828a19535f833727fa62") {
      throw new Error("Invalid tree hash");
    }
  },
  function testEncodeCommit() {
    commit = {
      tree: treeHash,
      author: {
        name: "Tim Caswell",
        email: "tim@creationix.com",
        date: {
          seconds: 1391790884,
          offset: 7 * 60
        }
      },
      message: "Test Commit\n"
    };
    commitBin = codec.frame({type: "commit", body: commit});
    commitHash = sha1(commitBin);
    if (commitHash !== "500c37fc17988b90c82d812a2d6fc25b15354bf2") {
      throw new Error("Invalid commit hash");
    }
  },
  function testEncodeTag() {
    tag = {
      object: commitHash,
      type: "commit",
      tag: "mytag",
      tagger: {
        name: "Tim Caswell",
        email: "tim@creationix.com",
        date: {
          seconds: 1391790910,
          offset: 7 * 60
        }
      },
      message: "Tag it!\n"
    };
    tagBin = codec.frame({type: "tag", body: tag});
    tagHash = sha1(tagBin);
    if (tagHash !== "49522787662a0183652dc9cafa5c008b5a0e0c2a") {
      throw new Error("Invalid tag hash");
    }
  },
  function testDecodeTag() {
    var obj = codec.deframe(tagBin, true);
    if (obj.type !== "tag") throw new Error("Invalid type");
    if (!(obj.body.object === tag.object && obj.body.message === tag.message)) {
      throw new Error("Problem decoding");
    }
  },
  function testDecodeCommit() {
    var obj = codec.deframe(commitBin, true);
    if (obj.type !== "commit") throw new Error("Invalid type");
    if (!(obj.body.tree === commit.tree &&
          obj.body.message === commit.message &&
          obj.body.author.date.seconds === commit.author.date.seconds)) {
      throw new Error("Problem decoding");
    }
  },
  function testDecodeTree() {
    var obj = codec.deframe(treeBin, true);
    if (obj.type !== "tree") throw new Error("Invalid type");
    if (obj.body["greeting.txt"].hash !== tree["greeting.txt"].hash) {
      throw new Error("Problem decoding");
    }
  },
  function testDecodeBlob() {
    var obj = codec.deframe(blobBin, true);
    if (obj.type !== "blob") throw new Error("Invalid type");
    if (bodec.toUnicode(obj.body) !== blob) {
      throw new Error("Problem decoding");
    }
  },
  function testUnicodeFilePath() {
    var name = "æðelen";
    var tree = {};
    tree[name] = {
      mode: modes.file,
      hash: blobHash
    };
    var bin = codec.frame({type:"tree", body: tree});
    var obj = codec.deframe(bin, true);
    var newName = Object.keys(obj.body)[0];
    if (newName !== name) {
      console.log(newName + " != " + name);
      throw new Error("Problem storing and retrieving utf8 paths");
    }
    if (obj.body[name].hash !== tree[name].hash) {
      throw new Error("Problem decoding hash hex");
    }
  },
  function testUnicodeCommit() {
    var commit = {
      tree: treeHash,
      author: {
        name: "Laȝamon",
        email: "laȝamon@chronicles-of-england.org"
      },
      message: "An preost wes on leoden, Laȝamon was ihoten\nHe wes Leovenaðes sone -- liðe him be Drihten\n"
    };
    var bin = codec.frame({type:"commit", body:commit});
    var obj = codec.deframe(bin, true);
    if (commit.author.name !== obj.body.author.name ||
        commit.author.email !== obj.body.author.email ||
        commit.message !== obj.body.message) {
      console.log([obj.body.author, obj.body.message]);
      throw new Error("Problem decoding utf8 parts in commit");
    }
  },
  function testUnicodeTag() {
    var tag = {
      object: commitHash,
      type: "commit",
      tag: "Laȝamon",
      tagger: {
        name: "Laȝamon",
        email: "laȝamon@chronicles-of-england.org"
      },
      message: "He wonede at Ernleȝe at æðelen are chirechen,\nUppen Sevarne staþe, sel þar him þuhte,\nOnfest Radestone, þer he bock radde.\n"
    };
    var bin = codec.frame({type:"tag", body:tag});
    var obj = codec.deframe(bin, true);
    if (tag.tagger.name !== obj.body.tagger.name ||
        tag.tagger.email !== obj.body.tagger.email ||
        tag.message !== obj.body.message) {
      console.log([obj.body.tagger, obj.body.message]);
      throw new Error("Problem decoding utf8 parts in tag");
    }
  },
  function testBinaryBlob() {
    var blob = bodec.create(256);
    for (var i = 0; i < 256; i++) { blob[i] = i; }
    var bin = codec.frame({type:"blob",body:blob});
    var obj = codec.deframe(bin, true);
    if (bodec.toRaw(blob) !== bodec.toRaw(obj.body)) {
      throw new Error("Problem decoding binary blob");
    }
  }
]);
