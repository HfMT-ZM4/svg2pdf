const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const path = require('path');
const fs = require('fs');
const Max = require('max-api');

PDFDocument.prototype.addSVG = function(svg, x, y, options)
{
    return SVGtoPDF(this, svg, x, y, options), this;
};

let g_folder = undefined;
let g_files = [];
let g_outputfile = undefined;

let g_papersize = "A4";

let g_margins = {
    top : 100,
    right: 100,
    bottom: 47,
    left: 50
};

let debug = 1;
function trace(name)
{
    if(debug)
    {
    	Max.post("TRACE: " + name);
    }
}

function stripvol(p)
{
    let r = /[^:]+:(.*)/;
    let x = r.exec(p);
    if(x)
    {
        return x[1];
    }
    else
    {
        return p;
    }
}

Max.addHandler("folder", (path) => {
    trace("folder : " + path);
	let p = stripvol(path);
    if(p)
    {
        g_folder = p;
    }
    else
    {
        Max.post("couldn't conform path " + path);
    }
});

Max.addHandler("files", (...filelist) => {
    trace("files : " + filelist);
    let fl = [];
    for(const f of filelist)
    {
        let p = stripvol(f);
        if(p)
        {
            fl.push(p)
        }
        else
        {
            Max.post("couldn't conform path " + f);
            g_files = [];
            break;
        }
    }
    g_files = fl;
});

Max.addHandler("outputfile", (filename) => {
    trace("outputfile : " + filename);
    g_outputfile = filename;
});

Max.addHandlers({
    papersize: (ps) => {
        trace("papersize : " + ps);
        g_papersize = ps;
    },
    margintop: (m) => {
        trace("margintop : " + m);
        g_margins.top = m;
    },
    marginright: (m) => {
        trace("marginright : " + m);
        g_margins.right = m;
    },
    marginbottom: (m) => {
        trace("marginbottom : " + m);
        g_margins.bottom = m;
    },
    marginleft: (m) => {
        trace("marginleft : " + m);
        g_margins.left = m;
    }
});

function haveRequiredVars()
{
    if(g_folder == undefined)
    {
        Max.post("you must supply a folder");
        return false;
    }
    if(g_files.length <= 0)
    {
        Max.post("you must supply one or more files");
        return false;
    }
    if(g_outputfile == undefined)
    {
        Max.post("you must supply an output file name");
        return false;
    }
    return true;
}

Max.addHandler("bang", () => {
    trace("bang");
    if(!haveRequiredVars())
    {
        return;
    }
    let pdfdoc = undefined;
    let pdfdocstream = fs.createWriteStream(g_outputfile);
    
    // don't think we need to do this...
    // pdfdocstream.addListener('finish', function() {
    //     console.log("done");
    // });

    for(const f of g_files)
    {
        if(pdfdoc == undefined)
        {
            pdfdoc = new PDFDocument({size: g_papersize,
                                      margins: g_margins});
            pdfdoc.pipe(pdfdocstream);
        }
        else
        {
            pdfdoc.addPage();
        }
        let r = /(.*)\.[a-zA-Z0-9]+$/
        let stripped = r.exec(f);
        if(stripped)
        {
            // Max.post("stripped: " + stripped[0] + " " + stripped[1]);
            stripped = stripped[1];
        }
        else
        {
            stripped = f;
        }
    	let str = fs.readFileSync(f, {encoding: 'utf-8'});
        if(!str)
        {
            Max.post("error reading file " + f + "(" + err + ")");
            return;
        }
        let pdfpage = new PDFDocument({size: g_papersize,
                                       margins: g_margins});
        pdfpage.pipe(fs.createWriteStream(stripped + ".pdf"));
        pdfpage.addSVG(str, g_margins.left, g_margins.right);
        pdfpage.end();
        pdfdoc.addSVG(str, g_margins.left, g_margins.right);
    }
    pdfdoc.end();
});
