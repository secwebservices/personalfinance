package com.secwebservices.common.beans.editor;

import java.beans.PropertyEditorSupport;
import java.lang.reflect.Constructor;

import org.apache.commons.beanutils.ConversionException;
import org.apache.commons.lang.StringUtils;

public class StringConstructorEditor extends PropertyEditorSupport {
	private Class<?> classSupport;
	
	public StringConstructorEditor(Class<?> classSupport) {
		this.classSupport = classSupport;
	}
	
	public void setAsText(String text) throws IllegalArgumentException {
		if (StringUtils.isBlank(text) || text.equals("null")) {
			setValue(null);
		} else if (classSupport.isAssignableFrom(String.class)) {
			setValue((String) text);
		} else {
			Constructor<?> constructor = findStringConstructor(classSupport);
			if (constructor == null) {
				throw new ConversionException("No appropriate String-arg constructor found");
			}
			try {
				Class<?> argType = constructor.getParameterTypes()[0];
				if (argType.equals(String.class)) {
					setValue(constructor.newInstance(text));
				} else if (argType.equals(Integer.class) || argType.equals(int.class)) {
					setValue(constructor.newInstance(Integer.parseInt((String) text)));
				} else if (argType.equals(Float.class) || argType.equals(float.class)) {
					setValue(constructor.newInstance(Float.parseFloat((String) text)));
				} else if (argType.equals(Boolean.class) || argType.equals(boolean.class)) {
					setValue(constructor.newInstance(Boolean.parseBoolean((String) text)));
				} else if (argType.equals(Long.class) || argType.equals(long.class)) {
					setValue(constructor.newInstance(Long.parseLong((String) text)));
				} else if (argType.equals(Double.class) || argType.equals(double.class)) {
					setValue(constructor.newInstance(Double.parseDouble((String) text)));
				} else if (argType.equals(Short.class) || argType.equals(short.class)) {
					setValue(constructor.newInstance(Short.parseShort((String) text)));
				} else if (argType.equals(Byte.class) || argType.equals(byte.class)) {
					setValue(constructor.newInstance(Byte.parseByte((String) text)));
				} else if (argType.equals(Character.class) || argType.equals(char.class)) {
					setValue(constructor.newInstance(((String) text).charAt(0)));
				}
			} catch (Throwable e) {
				throw new IllegalArgumentException("Unable to create instance of type " + classSupport.getName(), e);
			}
		}
	}
	
	@SuppressWarnings("unchecked")
	protected <T> Constructor<T> findStringConstructor(Class<T> type) {
		Constructor<T> constructor = null;
		// prefer string constructor
		try {
			constructor = type.getConstructor(String.class);
		} catch (Throwable e) {
			// either no string constructor or not accessible
		}
		// if no string constructor check if a primitive or wrapper constructor exists
		if (constructor == null) {
			Constructor<?>[] constructors = type.getDeclaredConstructors();
			if (constructors != null && constructors.length > 0) {
				int constructorCount = constructors.length;
				for (int i = 0; i < constructorCount; i++) {
					Class<?>[] argTypes = constructors[i].getParameterTypes();
					if (argTypes.length == 1) {
						Class<?> constructorParamType = argTypes[0];
						if (
							Long.class.equals(constructorParamType) || long.class.equals(constructorParamType)
								|| Integer.class.equals(constructorParamType) || int.class.equals(constructorParamType)
								|| Short.class.equals(constructorParamType) || short.class.equals(constructorParamType)
								|| Float.class.equals(constructorParamType) || float.class.equals(constructorParamType)
								|| Double.class.equals(constructorParamType)
								|| double.class.equals(constructorParamType) || Byte.class.equals(constructorParamType)
								|| byte.class.equals(constructorParamType)
								|| Boolean.class.equals(constructorParamType)
								|| boolean.class.equals(constructorParamType)
								|| Character.class.equals(constructorParamType)
								|| char.class.equals(constructorParamType)
						) {
							constructor = (Constructor<T>) constructors[i];
							break;
						}
					}
				}
			}
		}
		return constructor;
	}
	
	public String getAsText() {
		Object value = getValue();
		if (value == null) {
			return "";
		} else {
			return super.getAsText();
		}
	}
	
}


