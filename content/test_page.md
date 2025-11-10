---
title: Test Page
layout: test_page
---
# Test1 *Test1* **Test1** ***Test1***
## Test2 *Test2* **Test2** ***Test2***
### Test3 *Test3* **Test3** ***Test3***
---
#### Test4 *Test4* **Test4** ***Test4***
##### Test5 *Test5* **Test5** ***Test5***
###### Test6 *Test6* **Test6** ***Test6***

Testp *Testp* **Testp** ***Testp***
---

[Citation]()

This is some good ol' inlined `code`..! You should look at `/docs/CODE.md`!

```python
"""
This is a multi-line docstring for a module.
It serves as a general description of the module's purpose.
"""

import os
import sys
from collections import defaultdict, namedtuple
from functools import wraps
from dataclasses import dataclass

type MyString = str

# Define a constant
MAX_RETRIES = 5

# A simple function definition
@wraps
def greet(name: str) -> str:
    """
    Greets a person by name.
    Args:
        name: The name of the person to greet.
    Returns:
        A greeting string.
    """
    if name is None or not isinstance(name, str):
        raise ValueError("Name must be a non-empty string.")
    message = f"Hello, {name}!"
    print(message)  # A print statement
    return message

@dataclass
class DummyClass:
    ...

class MyClass[Generic : int](int, MyString):
    """A sample class to test class-related theme elements."""

    class_variable = "I am a class variable"

    def __init__(self, value: int):
        local_variable = 0
        self.instance_variable = value  # An instance variable
        self._private_variable = "private" # A "private" variable
        self.__mangled_variable = "mangled" # A name-mangled variable
        local_variable -= 1
    

    @property
    def read_only_property(self) -> int:
        """A read-only property."""
        return self.instance_variable * 2

    def sample_method(self, arg1: str, arg2: list) -> None:
        """A sample method with various syntax elements. $x\in X$?"""
        local_variable = 10  # A local variable
        for item in arg2:
            if item == arg1:
                print(f"Found {item} matching {arg1}")
                break
            else:
                print(f"Item {item} does not match {arg1}")

        # A dictionary and list
        data = {
            "key1": "value1",
            "key2": 123,
            "key3": [1, 2, 3]
        }
        my_list = ["apple", "banana", "cherry"]

        # Exception handling
        try:
            result = local_variable / 0
        except ZeroDivisionError as e:
            print(f"Error: {e}")
        finally:
            print("Execution finished.")

        # Lambda function
        square = lambda x: x * x
        print(f"Square of 5: {square(5)}")

# Function calls and variable assignments
user_name = "Alice"
greeting_message = greet(user_name)

# Class instantiation and method calls
my_object = MyClass(42)
print(my_object.read_only_property)
my_object.sample_method("banana", ["apple", "orange", "banana"])

# Comments
# This is a single-line comment.
# TODO: Add more complex data structures.
# FIXME: This logic needs refactoring.

# Type hints and annotations
def process_data(data: dict[str, list[int]]) -> None:
    pass

# Async/await
async def fetch_data(url: str):
    # Simulate an asynchronous operation
    await asyncio.sleep(1)
    return {"data": "some_data"}

import asyncio
if __name__ == "__main__":
    print("Running main execution block.")
    asyncio.run(fetch_data("http://example.com"))
```

This is the inlined Q-function recurrence relation: $Q^\pi(s,a) = r(s,a) + \gamma\underset{s'\sim P(s'|s,a)}{\mathbb{E}}[Q^\pi(s',\pi(s'))]$. **Wow that's so nice!**

$$Q^\pi(s,a) = r(s,a) + \gamma\underset{s'\sim P(s'|s,a)}{\mathbb{E}}[Q^\pi(s',\pi(s'))]$$

* Bullet List
    * Sub item
        * Sub sub item

1. Ordered List 1
    1. Hello
        1. Hello 
