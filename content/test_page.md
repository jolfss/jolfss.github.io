---
title: Test Page
layout: test_page
---
# Test1 *Test1* **Test1** ***Test1***
## Test2 *Test2* **Test2** ***Test2***
### Test3 *Test3* **Test3** ***Test3***
#### Test4 *Test4* **Test4** ***Test4***
##### Test5 *Test5* **Test5** ***Test5***
###### Test6 *Test6* **Test6** ***Test6***

Testp *Testp* **Testp** ***Testp***

[Citation]()

This is some good ol' inlined `code`..! You should look at `/docs/CODE.md`!

<pre class="ts-highlight ts-python"><code><span class="ts-string">&quot;&quot;&quot;</span><span class="ts-string">
This is a multi-line docstring for a module.
It serves as a general description of the module&#039;s purpose.
</span><span class="ts-string">&quot;&quot;&quot;</span>

<span class="ts-keyword">import</span> <span class="ts-identifier">os</span>
<span class="ts-keyword">import</span> <span class="ts-identifier">sys</span>
<span class="ts-keyword">from</span> <span class="ts-identifier">collections</span> <span class="ts-keyword">import</span> <span class="ts-identifier">defaultdict</span><span class="ts-punctuation">,</span> <span class="ts-identifier">namedtuple</span>
<span class="ts-keyword">from</span> <span class="ts-identifier">functools</span> <span class="ts-keyword">import</span> <span class="ts-identifier">wraps</span>
<span class="ts-keyword">from</span> <span class="ts-identifier">dataclasses</span> <span class="ts-keyword">import</span> <span class="ts-identifier">dataclass</span>

<span class="ts-keyword">type</span> <span class="ts-type">MyString</span> <span class="ts-operator">=</span> <span class="ts-type">str</span>

<span class="ts-comment"># Define a constant</span>
<span class="ts-constant">MAX_RETRIES</span> <span class="ts-operator">=</span> <span class="ts-number">5</span>

<span class="ts-comment"># A simple function definition</span>
<span class="ts-decorator">@</span><span class="ts-identifier">wraps</span>
<span class="ts-keyword">def</span> <span class="ts-function-name">greet</span><span class="ts-punctuation">(</span><span class="ts-parameter">name</span><span class="ts-punctuation">:</span> <span class="ts-type">str</span><span class="ts-punctuation">)</span> <span class="ts-punctuation">-&gt;</span> <span class="ts-type">str</span><span class="ts-punctuation">:</span>
    <span class="ts-string">&quot;&quot;&quot;</span><span class="ts-string">
    Greets a person by name.
    Args:
        name: The name of the person to greet.
    Returns:
        A greeting string.
    </span><span class="ts-string">&quot;&quot;&quot;</span>
    <span class="ts-keyword">if</span> <span class="ts-identifier">name</span> <span class="ts-keyword">is</span> <span class="ts-null">None</span> <span class="ts-keyword">or</span> <span class="ts-keyword">not</span> <span class="ts-function-call">isinstance</span><span class="ts-punctuation">(</span><span class="ts-identifier">name</span><span class="ts-punctuation">,</span> <span class="ts-builtin">str</span><span class="ts-punctuation">)</span><span class="ts-punctuation">:</span>
        <span class="ts-keyword">raise</span> <span class="ts-function-call">ValueError</span><span class="ts-punctuation">(</span><span class="ts-string">&quot;</span><span class="ts-string">Name must be a non-empty string.</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span>
    <span class="ts-identifier">message</span> <span class="ts-operator">=</span> <span class="ts-string">f&quot;</span><span class="ts-string">Hello, </span><span class="ts-punctuation">{</span><span class="ts-identifier">name</span><span class="ts-punctuation">}</span><span class="ts-string">!</span><span class="ts-string">&quot;</span>
    <span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-identifier">message</span><span class="ts-punctuation">)</span>  <span class="ts-comment"># A print statement</span>
    <span class="ts-keyword">return</span> <span class="ts-identifier">message</span>

<span class="ts-decorator">@</span><span class="ts-identifier">dataclass</span>
<span class="ts-keyword">class</span> <span class="ts-class">DummyClass</span><span class="ts-punctuation">:</span>
    <span class="ts-ellipsis">...</span>

<span class="ts-keyword">class</span> <span class="ts-class">MyClass</span><span class="ts-punctuation">[</span><span class="ts-type">Generic</span> <span class="ts-punctuation">:</span> <span class="ts-type">int</span><span class="ts-punctuation">]</span><span class="ts-punctuation">(</span><span class="ts-builtin">int</span><span class="ts-punctuation">,</span> <span class="ts-identifier">MyString</span><span class="ts-punctuation">)</span><span class="ts-punctuation">:</span>
    <span class="ts-string">&quot;&quot;&quot;</span><span class="ts-string">A sample class to test class-related theme elements.</span><span class="ts-string">&quot;&quot;&quot;</span>

    <span class="ts-identifier">class_variable</span> <span class="ts-operator">=</span> <span class="ts-string">&quot;</span><span class="ts-string">I am a class variable</span><span class="ts-string">&quot;</span>

    <span class="ts-keyword">def</span> <span class="ts-function-name">__init__</span><span class="ts-punctuation">(</span><span class="ts-identifier">self</span><span class="ts-punctuation">,</span> <span class="ts-parameter">value</span><span class="ts-punctuation">:</span> <span class="ts-type">int</span><span class="ts-punctuation">)</span><span class="ts-punctuation">:</span>
        <span class="ts-identifier">local_variable</span> <span class="ts-operator">=</span> <span class="ts-number">0</span>
        <span class="ts-identifier">self</span><span class="ts-punctuation">.</span><span class="ts-property">instance_variable</span> <span class="ts-operator">=</span> <span class="ts-identifier">value</span>  <span class="ts-comment"># An instance variable</span>
        <span class="ts-identifier">self</span><span class="ts-punctuation">.</span><span class="ts-property">_private_variable</span> <span class="ts-operator">=</span> <span class="ts-string">&quot;</span><span class="ts-string">private</span><span class="ts-string">&quot;</span> <span class="ts-comment"># A &quot;private&quot; variable</span>
        <span class="ts-identifier">self</span><span class="ts-punctuation">.</span><span class="ts-property">__mangled_variable</span> <span class="ts-operator">=</span> <span class="ts-string">&quot;</span><span class="ts-string">mangled</span><span class="ts-string">&quot;</span> <span class="ts-comment"># A name-mangled variable</span>
        <span class="ts-identifier">local_variable</span> <span class="ts-operator">-=</span> <span class="ts-number">1</span>
    

    <span class="ts-decorator">@</span><span class="ts-identifier">property</span>
    <span class="ts-keyword">def</span> <span class="ts-function-name">read_only_property</span><span class="ts-punctuation">(</span><span class="ts-identifier">self</span><span class="ts-punctuation">)</span> <span class="ts-punctuation">-&gt;</span> <span class="ts-type">int</span><span class="ts-punctuation">:</span>
        <span class="ts-string">&quot;&quot;&quot;</span><span class="ts-string">A read-only property.</span><span class="ts-string">&quot;&quot;&quot;</span>
        <span class="ts-keyword">return</span> <span class="ts-identifier">self</span><span class="ts-punctuation">.</span><span class="ts-property">instance_variable</span> <span class="ts-operator">*</span> <span class="ts-number">2</span>

    <span class="ts-keyword">def</span> <span class="ts-function-name">sample_method</span><span class="ts-punctuation">(</span><span class="ts-identifier">self</span><span class="ts-punctuation">,</span> <span class="ts-parameter">arg1</span><span class="ts-punctuation">:</span> <span class="ts-type">str</span><span class="ts-punctuation">,</span> <span class="ts-parameter">arg2</span><span class="ts-punctuation">:</span> <span class="ts-type">list</span><span class="ts-punctuation">)</span> <span class="ts-punctuation">-&gt;</span> <span class="ts-null">None</span><span class="ts-punctuation">:</span>
        <span class="ts-string">&quot;&quot;&quot;</span><span class="ts-string">A sample method with various syntax elements.</span><span class="ts-string">&quot;&quot;&quot;</span>
        <span class="ts-identifier">local_variable</span> <span class="ts-operator">=</span> <span class="ts-number">10</span>  <span class="ts-comment"># A local variable</span>
        <span class="ts-keyword">for</span> <span class="ts-identifier">item</span> <span class="ts-keyword">in</span> <span class="ts-identifier">arg2</span><span class="ts-punctuation">:</span>
            <span class="ts-keyword">if</span> <span class="ts-identifier">item</span> <span class="ts-operator">==</span> <span class="ts-identifier">arg1</span><span class="ts-punctuation">:</span>
                <span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-string">f&quot;</span><span class="ts-string">Found </span><span class="ts-punctuation">{</span><span class="ts-identifier">item</span><span class="ts-punctuation">}</span><span class="ts-string"> matching </span><span class="ts-punctuation">{</span><span class="ts-identifier">arg1</span><span class="ts-punctuation">}</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span>
                <span class="ts-keyword">break</span>
            <span class="ts-keyword">else</span><span class="ts-punctuation">:</span>
                <span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-string">f&quot;</span><span class="ts-string">Item </span><span class="ts-punctuation">{</span><span class="ts-identifier">item</span><span class="ts-punctuation">}</span><span class="ts-string"> does not match </span><span class="ts-punctuation">{</span><span class="ts-identifier">arg1</span><span class="ts-punctuation">}</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span>

        <span class="ts-comment"># A dictionary and list</span>
        <span class="ts-identifier">data</span> <span class="ts-operator">=</span> <span class="ts-punctuation">{</span>
            <span class="ts-string">&quot;</span><span class="ts-string">key1</span><span class="ts-string">&quot;</span><span class="ts-punctuation">:</span> <span class="ts-string">&quot;</span><span class="ts-string">value1</span><span class="ts-string">&quot;</span><span class="ts-punctuation">,</span>
            <span class="ts-string">&quot;</span><span class="ts-string">key2</span><span class="ts-string">&quot;</span><span class="ts-punctuation">:</span> <span class="ts-number">123</span><span class="ts-punctuation">,</span>
            <span class="ts-string">&quot;</span><span class="ts-string">key3</span><span class="ts-string">&quot;</span><span class="ts-punctuation">:</span> <span class="ts-punctuation">[</span><span class="ts-number">1</span><span class="ts-punctuation">,</span> <span class="ts-number">2</span><span class="ts-punctuation">,</span> <span class="ts-number">3</span><span class="ts-punctuation">]</span>
        <span class="ts-punctuation">}</span>
        <span class="ts-identifier">my_list</span> <span class="ts-operator">=</span> <span class="ts-punctuation">[</span><span class="ts-string">&quot;</span><span class="ts-string">apple</span><span class="ts-string">&quot;</span><span class="ts-punctuation">,</span> <span class="ts-string">&quot;</span><span class="ts-string">banana</span><span class="ts-string">&quot;</span><span class="ts-punctuation">,</span> <span class="ts-string">&quot;</span><span class="ts-string">cherry</span><span class="ts-string">&quot;</span><span class="ts-punctuation">]</span>

        <span class="ts-comment"># Exception handling</span>
        <span class="ts-keyword">try</span><span class="ts-punctuation">:</span>
            <span class="ts-identifier">result</span> <span class="ts-operator">=</span> <span class="ts-identifier">local_variable</span> <span class="ts-operator">/</span> <span class="ts-number">0</span>
        <span class="ts-keyword">except</span> <span class="ts-identifier">ZeroDivisionError</span> <span class="ts-keyword">as</span> <span class="ts-identifier">e</span><span class="ts-punctuation">:</span>
            <span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-string">f&quot;</span><span class="ts-string">Error: </span><span class="ts-punctuation">{</span><span class="ts-identifier">e</span><span class="ts-punctuation">}</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span>
        <span class="ts-keyword">finally</span><span class="ts-punctuation">:</span>
            <span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-string">&quot;</span><span class="ts-string">Execution finished.</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span>

        <span class="ts-comment"># Lambda function</span>
        <span class="ts-identifier">square</span> <span class="ts-operator">=</span> <span class="ts-keyword">lambda</span> <span class="ts-identifier">x</span><span class="ts-punctuation">:</span> <span class="ts-identifier">x</span> <span class="ts-operator">*</span> <span class="ts-identifier">x</span>
        <span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-string">f&quot;</span><span class="ts-string">Square of 5: </span><span class="ts-punctuation">{</span><span class="ts-function-call">square</span><span class="ts-punctuation">(</span><span class="ts-number">5</span><span class="ts-punctuation">)</span><span class="ts-punctuation">}</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span>

<span class="ts-comment"># Function calls and variable assignments</span>
<span class="ts-identifier">user_name</span> <span class="ts-operator">=</span> <span class="ts-string">&quot;</span><span class="ts-string">Alice</span><span class="ts-string">&quot;</span>
<span class="ts-identifier">greeting_message</span> <span class="ts-operator">=</span> <span class="ts-function-call">greet</span><span class="ts-punctuation">(</span><span class="ts-identifier">user_name</span><span class="ts-punctuation">)</span>

<span class="ts-comment"># Class instantiation and method calls</span>
<span class="ts-identifier">my_object</span> <span class="ts-operator">=</span> <span class="ts-function-call">MyClass</span><span class="ts-punctuation">(</span><span class="ts-number">42</span><span class="ts-punctuation">)</span>
<span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-identifier">my_object</span><span class="ts-punctuation">.</span><span class="ts-property">read_only_property</span><span class="ts-punctuation">)</span>
<span class="ts-identifier">my_object</span><span class="ts-punctuation">.</span><span class="ts-method-name">sample_method</span><span class="ts-punctuation">(</span><span class="ts-string">&quot;</span><span class="ts-string">banana</span><span class="ts-string">&quot;</span><span class="ts-punctuation">,</span> <span class="ts-punctuation">[</span><span class="ts-string">&quot;</span><span class="ts-string">apple</span><span class="ts-string">&quot;</span><span class="ts-punctuation">,</span> <span class="ts-string">&quot;</span><span class="ts-string">orange</span><span class="ts-string">&quot;</span><span class="ts-punctuation">,</span> <span class="ts-string">&quot;</span><span class="ts-string">banana</span><span class="ts-string">&quot;</span><span class="ts-punctuation">]</span><span class="ts-punctuation">)</span>

<span class="ts-comment"># Comments</span>
<span class="ts-comment"># This is a single-line comment.</span>
<span class="ts-comment"># TODO: Add more complex data structures.</span>
<span class="ts-comment"># FIXME: This logic needs refactoring.</span>

<span class="ts-comment"># Type hints and annotations</span>
<span class="ts-keyword">def</span> <span class="ts-function-name">process_data</span><span class="ts-punctuation">(</span><span class="ts-parameter">data</span><span class="ts-punctuation">:</span> <span class="ts-builtin">dict</span><span class="ts-punctuation">[</span><span class="ts-type">str</span><span class="ts-punctuation">,</span> <span class="ts-builtin">list</span><span class="ts-punctuation">[</span><span class="ts-type">int</span><span class="ts-punctuation">]</span><span class="ts-punctuation">]</span><span class="ts-punctuation">)</span> <span class="ts-punctuation">-&gt;</span> <span class="ts-null">None</span><span class="ts-punctuation">:</span>
    <span class="ts-keyword">pass</span>

<span class="ts-comment"># Async/await</span>
<span class="ts-keyword">async</span> <span class="ts-keyword">def</span> <span class="ts-function-name">fetch_data</span><span class="ts-punctuation">(</span><span class="ts-parameter">url</span><span class="ts-punctuation">:</span> <span class="ts-type">str</span><span class="ts-punctuation">)</span><span class="ts-punctuation">:</span>
    <span class="ts-comment"># Simulate an asynchronous operation</span>
    <span class="ts-keyword">await</span> <span class="ts-identifier">asyncio</span><span class="ts-punctuation">.</span><span class="ts-method-name">sleep</span><span class="ts-punctuation">(</span><span class="ts-number">1</span><span class="ts-punctuation">)</span>
    <span class="ts-keyword">return</span> <span class="ts-punctuation">{</span><span class="ts-string">&quot;</span><span class="ts-string">data</span><span class="ts-string">&quot;</span><span class="ts-punctuation">:</span> <span class="ts-string">&quot;</span><span class="ts-string">some_data</span><span class="ts-string">&quot;</span><span class="ts-punctuation">}</span>

<span class="ts-keyword">import</span> <span class="ts-identifier">asyncio</span>
<span class="ts-keyword">if</span> <span class="ts-method-name">__name__</span> <span class="ts-operator">==</span> <span class="ts-string">&quot;</span><span class="ts-string">__main__</span><span class="ts-string">&quot;</span><span class="ts-punctuation">:</span>
    <span class="ts-function-call">print</span><span class="ts-punctuation">(</span><span class="ts-string">&quot;</span><span class="ts-string">Running main execution block.</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span>
    <span class="ts-identifier">asyncio</span><span class="ts-punctuation">.</span><span class="ts-method-name">run</span><span class="ts-punctuation">(</span><span class="ts-function-call">fetch_data</span><span class="ts-punctuation">(</span><span class="ts-string">&quot;</span><span class="ts-string">http://example.com</span><span class="ts-string">&quot;</span><span class="ts-punctuation">)</span><span class="ts-punctuation">)</span>
</code></pre>

This is the inlined Q-function recurrence relation: $Q^\pi(s,a) = r(s,a) + \gamma\underset{s'\sim P(s'|s,a)}{\mathbb{E}}[Q^\pi(s',\pi(s'))]$. **Wow that's so nice!**

$$Q^\pi(s,a) = r(s,a) + \gamma\underset{s'\sim P(s'|s,a)}{\mathbb{E}}[Q^\pi(s',\pi(s'))]$$

* Bullet List
    * Sub item
        * Sub sub item

1. Ordered List 1
    1. Hello
        1. Hello 
